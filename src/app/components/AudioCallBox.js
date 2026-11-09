'use strict';

const React = require('react');
const PropTypes = require('prop-types');
const { default: clsx } = require('clsx');
const debug = require('debug');
const hark = require('hark');
const sylkrtc = require('sylkrtc');
const { Badge, IconButton } = require('@material-ui/core');
const { withStyles } = require('@material-ui/core/styles');
const {
    NetworkCheck: NetworkCheckIcon
} = require('@material-ui/icons');

const CallOverlay = require('./CallOverlay');
const CallQuality = require('./CallQuality');
const ConferenceDrawer = require('./ConferenceDrawer');
const DragAndDrop = require('./DragAndDrop');
const DTMFModal = require('./DTMFModal');
const { default: FileUploadModal } = require('./FileUploadModal');
const Statistics = require('./Statistics');
const UserIcon = require('./UserIcon');
const { default: EscalateConferenceModal } = require('./EscalateConferenceModal');
const SwitchDevicesMenu = require('./SwitchDevicesMenu');

const fileTransferUtils = require('../fileTransferUtils');
const utils = require('../utils');

const DEBUG = debug('blinkrtc:AudioCallBox');


const styleSheet = {
    badge: {
        width: '20px',
        height: '20px',
        fontWeight: 'bold',
        fontSize: '1rem',
        backgroundColor: '#337ab7',
        '&.MuiBadge-anchorOriginTopLeftCircular': {
            top: '18%',
            left: '18%'
        },
        '&.MuiBadge-anchorOriginTopRightCircular': {
            top: '18%',
            right: '18%'
        }
    },
    sharingButton: {
        width: '45px',
        height: '45px',
        backgroundColor: '#fff',
        fontSize: '20px',
        border: '1px solid #fff',
        color: '#333',
        margin: '4px',
        '&:hover': {
            backgroundColor: '#fff'
        }
    }
};
class AudioCallBox extends React.Component {
    constructor(props) {
        super(props);
        const data = new Array(60).fill({});

        this.state = {
            active: false,
            audioMuted: false,
            showDtmfModal: false,
            showEscalateConferenceModal: false,
            showAudioSwitchMenu: false,
            showStatistics: false,
            showInlineChat: false,
            audioGraphData: data,
            upload: null,
            earlyMedia: false,
            showExtraButtons: false,
            lastData: {}
        };
        this.speechEvents = null;
        this._harkStreamId = null;

        this._notificationCenter = null;

        // ES6 classes no longer autobind
        [
            'callStateChanged',
            'hangupCall',
            'muteAudio',
            'showDtmfModal',
            'hideDtmfModal',
            'toggleEscalateConferenceModal',
            'toggleAudioSwitchMenu',
            'toggleStatistics',
            'toggleChatInCall',
            'toggleInlineChat',
            'escalateToConference',
            'onKeyDown',
            'incomingMessage',
            'statistics',
            'handleFiles',
            'handleDrop',
            'uploadFiles'
        ].forEach((name) => {
            this[name] = this[name].bind(this);
        });
    }

    componentDidMount() {
        if (this.props.notificationCenter) {
            this._notificationCenter = this.props.notificationCenter();
        }

        const call = this.props.call;

        // This component is used both as the 'local media' phase (call === null)
        // and as the in-call component (call !== null).
        // - call === null: start the outgoing call via mediaPlaying()
        // - call.state === 'incoming': answer it via mediaPlaying()
        // - otherwise the call is already past that phase, so don't call mediaPlaying(u)
        if (call != null) {
            switch (call.state) {
                case 'established':
                case 'accepted':
                    // Call is al aangenomen bij mount (bijv. vanuit ChatCall)
                    this.attachStream(call);
                    call.on('stateChanged', this.callStateChanged);
                    break;
                case 'incoming':
                    this.props.mediaPlaying();
                    call.on('stateChanged', this.callStateChanged);
                    break;
                default:
                    call.on('stateChanged', this.callStateChanged);
                    break;
            }

            call.statistics.on('stats', this.statistics);
            call.account.on('incomingMessage', this.incomingMessage);

            const localStream = call.getLocalStreams()[0];
            const audioTrack = localStream && localStream.getAudioTracks()[0];
            if (audioTrack) {
                this.setState({ audioMuted: !audioTrack.enabled });
            }
        } else {
            this.props.mediaPlaying();
        }

        document.addEventListener('keydown', this.onKeyDown);
    }

    componentDidUpdate(prevProps, prevState) {
        if (prevProps.call == null && this.props.call) {
            const call = this.props.call;
            call.statistics.on('stats', this.statistics);
            call.account.on('incomingMessage', this.incomingMessage);
            call.on('stateChanged', this.callStateChanged);

            if (call.state === 'established' || call.state === 'accepted') {
                this.attachStream(call);
            }
        }
    }

    componentWillUnmount() {
        if (this.speechEvents !== null) {
            this.speechEvents.stop();
            this.speechEvents = null;
        }
        document.removeEventListener('keydown', this.onKeyDown);
        if (this.props.call) {
            this.props.call.removeListener('stateChanged', this.callStateChanged);
            this.props.call.account.removeListener('incomingMessage', this.incomingMessage);
            this.props.call.statistics.removeListener('stats', this.statistics);
        }
    }

    onKeyDown(event) {
        if (!this.state.showEscalateConferenceModal && !this.state.showDtmfModal && !this.props.propagateKeyPress) {
            switch (event.which) {
                case 77:    // m/M
                    this.muteAudio(event)
                    break;
                default:
                    break;
            }
        }
    }

    callStateChanged(oldState, newState, data) {
        if (newState === 'accepted' || newState === 'established') {
            this.attachStream(this.props.call);
        } else if (newState === 'early-media') {
            this.setState({ earlyMedia: true });
        }
    }

    statistics(stats) {
        const audioData = stats.data.audio;
        const audioRemoteData = stats.data.remote.audio;
        const audioRemoteExists = audioRemoteData.inbound[0];

        if (!audioRemoteExists) {
            return;
        }

        const audioJitter = audioData?.inbound[0]?.jitter || 0;
        const audioRTT = audioRemoteData.inbound[0].roundTripTime || 0;

        const audioPacketsLostOutbound = audioRemoteExists && audioRemoteData.inbound[0].packetLossRate || 0;
        const audioPacketsLostInbound = audioData.inbound[0].packetLossRate || 0;
        const audioPacketRateOutbound = (audioData && audioData.outbound[0].packetRate) || 0;
        const audioPacketRateInbound = (audioData && audioData.inbound[0].packetRate) || 0;

        const addData = {
            timestamp: audioData.timestamp,
            incomingBitrate: audioData.inbound[0].bitrate || 0,
            outgoingBitrate: audioData.outbound[0].bitrate || 0,
            latency: audioRTT,
            jitter: audioJitter,
            packetsLostOutbound: audioPacketsLostOutbound,
            packetsLostInbound: audioPacketsLostInbound,
            packetRateOutbound: audioPacketRateOutbound,
            packetRateInbound: audioPacketRateInbound
        };
        this.setState(state => {
            const audioGraphData = state.audioGraphData.concat(addData);
            audioGraphData.shift();
            return {
                audioGraphData,
                lastData: stats.data
            };
        });
    }

    attachStream(call) {
        if (!this.state.showExtraButtons) {
            this.setState({ showExtraButtons: true });
        }

        const remoteStream = call.getRemoteStreams()[0];
        const audioEl = this.props.remoteAudio && this.props.remoteAudio.current;
        if (!remoteStream || !audioEl) {
            return;
        }

        if (!audioEl.srcObject || audioEl.srcObject.id !== remoteStream.id) {
            DEBUG('Attaching audio');
            sylkrtc.utils.attachMediaStream(remoteStream, audioEl);
        }

        if (this.speechEvents !== null && this._harkStreamId !== remoteStream.id) {
            this.speechEvents.stop();
            this.speechEvents = null;
        }
        if (this.speechEvents === null) {
            this._harkStreamId = remoteStream.id;
            this.speechEvents = hark(remoteStream, { interval: 225, play: false });
            this.speechEvents.on('speaking', () => this.setState({ active: true }));
            this.speechEvents.on('stopped_speaking', () => this.setState({ active: false }));
        }
    }


    escalateToConference(participants) {
        this.props.escalateToConference(participants);
    }

    hangupCall(event) {
        event.preventDefault();
        this.props.hangupCall();
    }

    muteAudio(event) {
        event.preventDefault();
        const localStream = this.props.call.getLocalStreams()[0];

        if (this.state.audioMuted) {
            DEBUG('Unmute microphone');
            localStream.getAudioTracks()[0].enabled = true;
            this.setState({ audioMuted: false });
        } else {
            DEBUG('Mute microphone');
            localStream.getAudioTracks()[0].enabled = false;
            this.setState({ audioMuted: true });
        }

    }

    showDtmfModal() {
        this.setState({ showDtmfModal: true });
    }

    hideDtmfModal() {
        this.setState({ showDtmfModal: false });
    }

    toggleEscalateConferenceModal() {
        this.setState({
            showEscalateConferenceModal: !this.state.showEscalateConferenceModal
        });
    }

    toggleAudioSwitchMenu(event) {
        if (!event) {
            this.setState({
                showAudioSwitchMenu: !this.state.showAudioSwitchMenu
            });
        } else {
            event.currentTarget.blur();
            this.setState({
                switchAnchor: event.currentTarget,
                showAudioSwitchMenu: !this.state.showAudioSwitchMenu
            });
        }
    }

    toggleStatistics() {
        this.setState({
            showStatistics: !this.state.showStatistics
        });
    }

    toggleChatInCall() {
        this.props.toggleChatInCall();
    }

    toggleInlineChat() {
        this.setState({
            showInlineChat: !this.state.showInlineChat
        });
    }

    incomingMessage(message) {
        if (this.props.inlineChat !== undefined) {
            if (this.props.call.remoteIdentity.uri === message.sender.uri) {
                if (!this.state.showInlineChat) {
                    this._notificationCenter.postNewMessage(message, () => {
                        this.toggleInlineChat();
                    });
                }
            } else {
                if (!this.state.showChat) {
                    this._notificationCenter.postNewMessage(message, () => {
                        this.toggleChatInCall();
                    });
                }
            }
        }
    }

    uploadFiles(files, caption, uri) {
        this.setState({ upload: null });
        fileTransferUtils.upload(
            {
                notificationCenter: this.props.notificationCenter,
                account: this.props.call.account
            },
            files,
            uri,
            caption
        );
    };

    handleDrop(files) {
        DEBUG('Dropped file %o', [...files]);
        this.setState({
            upload: {
                files: [...files],
                uri: this.props.call.remoteIdentity.uri
            }
        });
    };

    handleFiles(e) {
        DEBUG('Selected files %o', e.target.files);
        this.setState({
            upload: {
                files: [...e.target.files],
                uri: this.props.call.remoteIdentity.uri
            }
        });
        e.target.value = '';
    }

    render() {
        const callState = this.props.call && this.props.call.state;
        const showExtraButtons = this.state.showExtraButtons ||
                callState === 'accepted' || callState === 'established';

        const commonButtonClasses = clsx({
            'btn': true,
            'btn-round': true,
            'btn-default': true
        });

        const muteButtonIconClasses = clsx({
            'fa': true,
            'fa-microphone': !this.state.audioMuted,
            'fa-microphone-slash': this.state.audioMuted
        });

        const menuButtonClasses = clsx({
            'btn': true,
            'btn-round-xs': true,
            'btn-default': true,
            'overlap': true,
            'overlap-top': true
        });

        const menuButtonIcons = clsx({
            'fa': true,
            'fa-caret-up': true
        });

        const callQuality = (<CallQuality audioData={this.state.audioGraphData} />);

        const baseLink = clsx(
            'btn',
            'btn-link',
        );

        const chatButtonClasses = clsx(
            baseLink
        );

        const callClasses = clsx({
            'drawer-half-visible': this.state.showInlineChat && !utils.isMobile.any(),
            'drawer-visible': this.state.showInlineChat && utils.isMobile.any()
        });

        const shareButtonClasses = clsx(
            commonButtonClasses,
            this.props.classes.sharingButton
        );

        const shareFileButtonIcons = clsx({
            'fa': true,
            'fa-upload': true
        });


        const unreadMessages = this.props.unreadMessages && (this.props.unreadMessages.total - this.props.unreadMessages.call) || 0;
        const unreadCallMessages = this.props.unreadMessages && this.props.unreadMessages.call || 0;

        const topButtons = {
            top: {
                left: []
            }
        };

        if (this.props.toggleChatInCall !== undefined) {
            topButtons.top.left = [
                <Badge key="unreadBadge" badgeContent={unreadMessages} color="primary" classes={{ badge: this.props.classes.badge }} overlap="circular">
                    <button
                        key="chatButton"
                        type="button"
                        className={chatButtonClasses}
                        onClick={this.toggleChatInCall}
                        title="Chat screen"
                    >
                        <i className="fa fa-comments fa-2x" />
                    </button>
                </Badge>
            ]
        }
        return (
            <React.Fragment>
                {this.state.upload &&
                    <FileUploadModal
                        show={this.state.upload !== null}
                        close={() => {
                            this.setState({ upload: null });
                        }}
                        upload={this.state.upload}
                        onConfirm={this.uploadFiles}
                    />
                }
                <DragAndDrop title="Drop files to share them" handleDrop={this.handleDrop}>
                    <div className={callClasses}>
                        {this.props.call &&
                            <SwitchDevicesMenu
                                show={this.state.showAudioSwitchMenu}
                                anchor={this.state.switchAnchor}
                                close={this.toggleAudioSwitchMenu}
                                call={this.props.call}
                                direction="up"
                                audio
                            />
                        }
                        <CallOverlay
                            show={true}
                            contact={this.props.contact}
                            call={this.props.call}
                            onTop={this.state.showChat}
                            disableHide={this.state.showChat || this.state.showInlineChat}
                            callQuality={callQuality}
                            buttons={topButtons}
                        />

                        <div className="call-user-icon">
                            <UserIcon contact={this.props.contact} large={true} active={this.state.active} />
                        </div>
                        <div className="call-buttons">
                            {!this.state.showChat && this.state.showExtraButtons &&
                                <button key="statisticsBtn" type="button" className={commonButtonClasses} onClick={this.toggleStatistics}>
                                    <NetworkCheckIcon />
                                </button>
                            }
                            {this.state.showExtraButtons &&
                                <button key="escalateButton" type="button" className={commonButtonClasses} onClick={this.toggleEscalateConferenceModal}>
                                    <i className="fa fa-user-plus"></i>
                                </button>
                            }
                            {this.props.call && this.props.startVideo && this.state.showExtraButtons &&
                                <button key="startVideoButton" type="button" title="Start video" className={commonButtonClasses} onClick={this.props.startVideo}>
                                    <i className="fa fa-video-camera"></i>
                                </button>
                            }
                            <div className="btn-container" key="audio">
                                <button key="muteAudio" type="button" className={commonButtonClasses} onClick={this.muteAudio}> <i className={muteButtonIconClasses}></i> </button>
                                <button key="audiodevices" type="button" title="Select audio devices" className={menuButtonClasses} onClick={this.toggleAudioSwitchMenu}> <i className={menuButtonIcons}></i> </button>
                            </div>
                            {this.props.inlineChat && <React.Fragment>
                                <Badge key="unreadBadge" badgeContent={unreadCallMessages} color="primary" classes={{ badge: this.props.classes.badge }} overlap="circular">
                                    <button key="inlineChatButton" type="button" className={commonButtonClasses} onClick={this.toggleInlineChat}>
                                        <i className="fa fa-commenting-o"></i>
                                    </button>
                                </Badge>
                                <input
                                    style={{ display: 'none' }}
                                    id="outlined-button-file"
                                    multiple
                                    type="file"
                                    onChange={this.handleFiles}
                                    key="1"
                                />
                                <label key="shareFiles" htmlFor="outlined-button-file">
                                    <IconButton title="Share files" component="span" disableRipple={true} className={shareButtonClasses}>
                                        <i className={shareFileButtonIcons}></i>
                                    </IconButton>
                                </label>
                            </React.Fragment>
                            }
                            <button key="dtmfButton" type="button" disabled={!this.state.earlyMedia && !this.state.showExtraButtons} className={commonButtonClasses} onClick={this.showDtmfModal}>
                                <i className="fa fa-fax"></i>
                            </button>
                            <br />
                            <button key="hangupButton" type="button" className="btn btn-round-big btn-danger" onClick={this.hangupCall}>
                                <i className="fa fa-phone rotate-135"></i>
                            </button>
                        </div>
                        <DTMFModal
                            show={this.state.showDtmfModal}
                            hide={this.hideDtmfModal}
                            call={this.props.call}
                        />
                        <EscalateConferenceModal
                            show={this.state.showEscalateConferenceModal}
                            call={this.props.call}
                            close={this.toggleEscalateConferenceModal}
                            escalateToConference={this.escalateToConference}
                        />
                        <ConferenceDrawer
                            show={this.state.showStatistics && !this.state.showChat}
                            anchor="left"
                            showClose={true}
                            close={this.toggleStatistics}
                            transparent={true}
                        >
                            <Statistics
                                audioData={this.state.audioGraphData}
                                lastData={this.state.lastData}
                            />
                        </ConferenceDrawer>
                    </div>
                    <ConferenceDrawer
                        show={this.state.showInlineChat && !this.state.showChat}
                        anchor="right"
                        showClose={true}
                        close={this.toggleInlineChat}
                        size={utils.isMobile.any() ? 'normal' : 'half'}
                        noBackgroundColor
                    >
                        {this.props.inlineChat}
                    </ConferenceDrawer>
                </DragAndDrop>
            </React.Fragment>
        );
    }
}

AudioCallBox.propTypes = {
    classes: PropTypes.object.isRequired,
    call: PropTypes.object,
    escalateToConference: PropTypes.func,
    hangupCall: PropTypes.func,
    mediaPlaying: PropTypes.func,
    startVideo: PropTypes.func,
    contact: PropTypes.object,
    notificationCenter: PropTypes.func,
    toggleChatInCall: PropTypes.func,
    inlineChat: PropTypes.object,
    unreadMessages: PropTypes.object,
    propagateKeyPress: PropTypes.bool,
    remoteAudio: PropTypes.object
};


module.exports = withStyles(styleSheet)(AudioCallBox);
