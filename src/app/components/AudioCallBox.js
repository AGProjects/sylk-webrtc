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
const Statistics = require('./Statistics');
const UserIcon = require('./UserIcon');
const EscalateConferenceModal = require('./EscalateConferenceModal');
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
            showChat: false,
            showInlineChat: false,
            audioGraphData: data,
            lastData: {}
        };
        this.speechEvents = null;

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
            'toggleCall',
            'toggleInlineChat',
            'escalateToConference',
            'onKeyDown',
            'incomingMessage',
            'statistics',
            'handleFiles',
            'handleDrop'
        ].forEach((name) => {
            this[name] = this[name].bind(this);
        });
    }

    componentDidMount() {
        // This component is used both for as 'local media' and as the in-call component.
        // Thus, if the call is not null it means we are beyond the 'local media' phase
        // so don't call the mediaPlaying prop.

        if (this.props.notificationCenter) {
            this._notificationCenter = this.props.notificationCenter();
        }

        if (this.props.call != null) {
            switch (this.props.call.state) {
                case 'established':
                    this.attachStream(this.props.call);
                    break;
                case 'incoming':
                    this.props.mediaPlaying();
                // fall through
                default:
                    this.props.call.on('stateChanged', this.callStateChanged);
                    break;
            }
            this.props.call.statistics.on('stats', this.statistics);
            this.props.call.account.on('incomingMessage', this.incomingMessage);
        } else {
            this.props.mediaPlaying();
        }
        document.addEventListener('keydown', this.onKeyDown);
    }

    componentDidUpdate(prevProps, prevState) {
        if (prevProps.call == null && this.props.call) {
            this.props.call.statistics.on('stats', this.statistics);
            this.props.call.account.on('incomingMessage', this.incomingMessage);
            if (this.props.call.state === 'established') {
                this.attachStream(this.props.call);
            } else {
                this.props.call.on('stateChanged', this.callStateChanged);
            }
        }
    }

    componentWillUnmount() {
        if (this.speechEvents !== null) {
            this.speechEvents.stop();
            this.speechEvents = null;
        }
        document.removeEventListener('keydown', this.onKeyDown);
        this.props.call.account.removeListener('incomingMessage', this.incomingMessage);
        this.props.call.statistics.removeListener('stats', this.statistics);
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
        if (newState === 'established') {
            this.attachStream(this.props.call);
        }
    }

    statistics(stats) {
        const audioData = stats.data.audio;
        const audioRemoteData = stats.data.remote.audio;
        const audioRemoteExists = audioRemoteData.inbound[0];

        if (!audioRemoteExists) {
            return;
        }

        const audioJitter = audioData.inbound[0].jitter || 0;
        const audioRTT = audioRemoteData.inbound[0].roundTripTime || 0;

        const audioPacketsLostOutbound = audioRemoteExists && audioRemoteData.inbound[0].packetLossRate || 0;
        const audioPacketsLostInbound = audioData.inbound[0].packetLossRate || 0;
        const audioPacketRateOutbound = (audioData && audioData.outbound[0].packetRate) || 0;
        const audioPacketRateInbound = (audioData && audioData.inbound[0].packetRate) || 0;

        const addData = {
            timestamp: audioData.timestamp,
            incomingBitrate: audioData.inbound[0].bitrate || 0,
            outgoingBitrate: audioData.outbound[0].bitrate || 0,
            latency: audioRTT / 2,
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
        const remoteStream = call.getRemoteStreams()[0];
        sylkrtc.utils.attachMediaStream(remoteStream, this.props.remoteAudio.current);
        const options = {
            interval: 225,
            play: false
        };
        this.speechEvents = hark(remoteStream, options);
        this.speechEvents.on('speaking', () => {
            this.setState({ active: true });
        });
        this.speechEvents.on('stopped_speaking', () => {
            this.setState({ active: false });
        });
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
        if (!this.state.showChat) {
            this.setState({
                showChat: !this.state.showChat
            });
            this.props.toggleChatInCall();
        }
    }

    toggleCall() {
        if (this.state.showChat) {
            this.setState({
                showChat: !this.state.showChat
            });
            this.props.toggleChatInCall();
        }
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

    handleDrop(files) {
        DEBUG('Dropped file %o', files);
        fileTransferUtils.upload(
            {
                notificationCenter: this.props.notificationCenter,
                account: this.props.call.account
            },
            files,
            this.props.call.remoteIdentity.uri
        );
    };

    handleFiles(e) {
        DEBUG('Selected files %o', e.target.files);
        fileTransferUtils.upload(
            {
                notificationCenter: this.props.notificationCenter,
                account: this.props.call.account
            },
            e.target.files,
            this.props.call.remoteIdentity.uri
        );
        e.target.value = '';
    }

    render() {
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

        const callButtonClasses = clsx(
            baseLink,
            {
                'active': !this.state.showChat,
                'blink': this.state.showChat
            }
        );

        const chatButtonClasses = clsx(
            baseLink,
            {
                'active': this.state.showChat
            }
        );

        const callClasses = clsx({
            'drawer-half-visible': this.state.showInlineChat && !this.state.showChat && !utils.isMobile.any(),
            'drawer-visible': this.state.showInlineChat && !this.state.showChat && utils.isMobile.any()
        });

        const shareButtonClasses = clsx(
            commonButtonClasses,
            this.props.classes.sharingButton
        );

        const shareFileButtonIcons = clsx({
            'fa': true,
            'fa-upload': true
        });

        let remoteIdentity;

        if (this.props.call !== null) {
            remoteIdentity = this.props.call.remoteIdentity;
        } else {
            remoteIdentity = { uri: this.props.remoteIdentity };
        }

        const unreadMessages = this.props.unreadMessages && (this.props.unreadMessages.total - this.props.unreadMessages.call) || 0;
        const unreadCallMessages = this.props.unreadMessages && this.props.unreadMessages.call || 0;

        const topButtons = {
            top: {
                left: []
            }
        };

        if (this.props.toggleChatInCall !== undefined) {
            if (!utils.isMobile.any()) {
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
                    </Badge>,
                    <button key="callButton" type="button" className={callButtonClasses} onClick={this.toggleCall} title="Call screen">
                        <i className="fa fa-2x fa-phone" />
                    </button>
                ]
            } else {
                if (this.state.showChat) {
                    topButtons.top.left = [
                        <button key="callButton" type="button" className={callButtonClasses} onClick={this.toggleCall}>
                            <i className="fa fa-2x fa-phone" />
                        </button>
                    ]
                } else {
                    topButtons.top.left = [
                        <Badge key="unreadBadge" badgeContent={unreadMessages} color="primary" classes={{ badge: this.props.classes.badge }} overlap="circular">
                            <button key="chatButton" type="button" className={chatButtonClasses} onClick={this.toggleChatInCall}>
                                <i className="fa fa-comments fa-2x" />
                            </button>
                        </Badge>
                    ]
                }
            }
        }
        return (
            <React.Fragment>
                <DragAndDrop title="Drop files to share them" handleDrop={this.handleDrop}>
                    <div className={callClasses}>
                        {this.props.call &&
                            <SwitchDevicesMenu
                                show={this.state.showAudioSwitchMenu}
                                anchor={this.state.switchAnchor}
                                close={this.toggleAudioSwitchMenu}
                                call={this.props.call}
                                setDevice={this.props.setDevice}
                                direction="up"
                                audio
                            />
                        }
                        <CallOverlay
                            show={true}
                            remoteIdentity={this.props.remoteIdentity}
                            call={this.props.call}
                            onTop={this.state.showChat}
                            disableHide={this.state.showChat || this.state.showInlineChat}
                            callQuality={callQuality}
                            buttons={topButtons}
                        />
                        <div className="call-user-icon">
                            <UserIcon identity={remoteIdentity} large={true} active={this.state.active} />
                        </div>
                        <div className="call-buttons">
                            {!this.state.showChat &&
                                <button key="statisticsBtn" type="button" className={commonButtonClasses} onClick={this.toggleStatistics}>
                                    <NetworkCheckIcon />
                                </button>
                            }
                            <button key="escalateButton" type="button" className={commonButtonClasses} onClick={this.toggleEscalateConferenceModal}>
                                <i className="fa fa-user-plus"></i>
                            </button>
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
                            <button key="dtmfButton" type="button" disabled={this.state.callDuration === null} className={commonButtonClasses} onClick={this.showDtmfModal}>
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
    setDevice: PropTypes.func.isRequired,
    call: PropTypes.object,
    escalateToConference: PropTypes.func,
    hangupCall: PropTypes.func,
    mediaPlaying: PropTypes.func,
    remoteIdentity: PropTypes.string,
    notificationCenter: PropTypes.func,
    toggleChatInCall: PropTypes.func,
    inlineChat: PropTypes.object,
    unreadMessages: PropTypes.object,
    propagateKeyPress: PropTypes.bool,
    remoteAudio: PropTypes.object
};


module.exports = withStyles(styleSheet)(AudioCallBox);
