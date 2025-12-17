'use strict';

const React = require('react');
const PropTypes = require('prop-types');
const { default: TransitionGroup } = require('react-transition-group/TransitionGroup');
const { default: CSSTransition } = require('react-transition-group/CSSTransition');
const ReactMixin = require('react-mixin');
const sylkrtc = require('sylkrtc');
const { Badge, IconButton } = require('@material-ui/core');
const { withStyles } = require('@material-ui/core/styles');
const {
    NetworkCheck: NetworkCheckIcon
} = require('@material-ui/icons');
const { default: clsx } = require('clsx');
const debug = require('debug');

const FullscreenMixin = require('../mixins/FullScreen');
const CallOverlay = require('./CallOverlay');
const CallQuality = require('./CallQuality');
const ConferenceDrawer = require('./ConferenceDrawer');
const DragAndDrop = require('./DragAndDrop');
const SwitchDevicesMenu = require('./SwitchDevicesMenu');
const EscalateConferenceModal = require('./EscalateConferenceModal');
const Statistics = require('./Statistics');

const fileTransferUtils = require('../fileTransferUtils');
const utils = require('../utils');

const DEBUG = debug('blinkrtc:Video');


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

class VideoBox extends React.Component {
    constructor(props) {
        super(props);
        const data = new Array(60).fill({});

        this.state = {
            callOverlayVisible: true,
            audioMuted: false,
            videoMuted: false,
            localVideoShow: false,
            remoteVideoShow: false,
            remoteSharesScreen: false,
            showEscalateConferenceModal: false,
            switchAnchor: null,
            showSwitchMenu: false,
            showAudioSwitchMenu: false,
            showStatistics: false,
            showChat: false,
            showInlineChat: false,
            videoGraphData: data,
            audioGraphData: data,
            callQuality: new Array(30).fill({}),
            lastData: {}
        };

        this.overlayTimer = null;
        this.localVideo = React.createRef();
        this.remoteVideo = React.createRef();
        this._notificationCenter = null;

        // ES6 classes no longer autobind
        [
            'showCallOverlay',
            'onKeyDown',
            'handleFullscreen',
            'handleRemoteVideoPlaying',
            'handleRemoteResize',
            'muteAudio',
            'muteVideo',
            'hangupCall',
            'toggleEscalateConferenceModal',
            'toggleSwitchMenu',
            'toggleAudioSwitchMenu',
            'toggleStatistics',
            'toggleChatInCall',
            'toggleInlineChat',
            'escalateToConference',
            'incomingMessage',
            'statistics',
            'handleFiles',
            'handleDrop'
        ].forEach((name) => {
            this[name] = this[name].bind(this);
        });
    }

    componentDidMount() {
        sylkrtc.utils.attachMediaStream(this.props.call.getLocalStreams()[0], this.localVideo.current, { disableContextMenu: true, muted: true });
        let promise = this.localVideo.current.play()
        if (promise !== undefined) {
            promise.then(_ => {
                this.setState({ localVideoShow: true });    // eslint-disable-line react/no-did-mount-set-state
                const localStream = this.props.call.getLocalStreams()[0];
                this.setState({audioMuted: !localStream.getAudioTracks()[0].enabled});
                // Autoplay started!
            }).catch(error => {
                // Autoplay was prevented.
                // Show a "Play" button so that user can start playback.
            });
        } else {
            this.localVideo.current.addEventListener('playing', () => {
                this.setState({ localVideoShow: true });    // eslint-disable-line react/no-did-mount-set-state
            });
        }

        if (this.props.notificationCenter) {
            this._notificationCenter = this.props.notificationCenter();
        }

        this.remoteVideo.current.addEventListener('playing', this.handleRemoteVideoPlaying);
        this.props.call.account.on('incomingMessage', this.incomingMessage);

        sylkrtc.utils.attachMediaStream(this.props.call.getRemoteStreams()[0], this.remoteVideo.current, {muted:true, disableContextMenu: true });
        sylkrtc.utils.attachMediaStream(this.props.call.getRemoteStreams()[0], this.props.remoteAudio.current, { disableContextMenu: true });

        this.props.call.statistics.on('stats', this.statistics);
        document.addEventListener('keydown', this.onKeyDown);
    }

    componentWillUnmount() {
        clearTimeout(this.overlayTimer);
        this.remoteVideo.current.removeEventListener('playing', this.handleRemoteVideoPlaying);
        this.exitFullscreen();
        document.removeEventListener('keydown', this.onKeyDown);
        this.props.call.account.removeListener('incomingMessage', this.incomingMessage);
        this.props.call.statistics.removeListener('stats', this.statistics);
    }

    onKeyDown(event) {
        if (!this.state.showEscalateConferenceModal && !this.props.propagateKeyPress) {
            switch (event.which) {
                case 77:    // m/M
                    this.muteAudio(event)
                    break;
                case 86:    // v/V
                    this.muteVideo(event)
                    break;
                case 83:    // s/S
                    event.preventDefault();
                    this.props.shareScreen();
                    setTimeout(() => { this.forceUpdate() }, 100);
                    break;
                case 70:    // f/F
                    event.preventDefault();
                    this.toggleFullscreen();
                    break;
                default:
                    break;
            }
        }
    }

    statistics(stats) {
        const videoData = stats.data.video;
        const audioData = stats.data.audio;

        const audioRemoteData = stats.data.remote.audio;
        const videoRemoteData = stats.data.remote.video;

        const videoRemoteExists = videoRemoteData.inbound[0];
        const audioRemoteExists = audioRemoteData.inbound[0];

        if (!videoRemoteExists && !audioRemoteExists) {
            return;
        }

        let videoRTT = (videoRemoteExists && videoRemoteData.inbound[0].roundTripTime) || 0
        const videoJitter = videoData.inbound[0].jitter || 0
        const videoPacketRateOutbound = (videoData && videoData.outbound[0].packetRate) || 0;
        const videoPacketRateInbound = (videoData && videoData.inbound[0].packetRate) || 0;
        const videoPacketsLostOutbound = videoRemoteExists && videoRemoteData.inbound[0].packetLossRate || 0;
        const videoPacketsLostInbound = videoData.inbound[0].packetLossRate || 0;

        const audioJitter = audioData.inbound[0].jitter || 0;
        const audioRTT = audioRemoteExists && audioRemoteData.inbound[0].roundTripTime || 0;
        const audioPacketsLostOutbound = audioRemoteExists && audioRemoteData.inbound[0].packetLossRate || 0;
        const audioPacketsLostInbound = audioData.inbound[0].packetLossRate || 0;
        const audioPacketRateOutbound = (audioData && audioData.outbound[0].packetRate) || 0;
        const audioPacketRateInbound = (audioData && audioData.inbound[0].packetRate) || 0;

        if (videoRTT === 0 && audioRTT !== 0) {
            videoRTT = audioRTT;
        }

        const addData = {
            audio: {
                timestamp: audioData.timestamp,
                incomingBitrate: audioData.inbound[0].bitrate || 0,
                outgoingBitrate: audioData.outbound[0].bitrate || 0,
                latency: audioRTT / 2,
                jitter: audioJitter,
                packetsLostOutbound: audioPacketsLostOutbound,
                packetsLostInbound: audioPacketsLostInbound,
                packetRateOutbound: audioPacketRateOutbound,
                packetRateInbound: audioPacketRateInbound
            },
            video: {
                timestamp: videoData.timestamp,
                incomingBitrate: videoData.inbound[0].bitrate || 0,
                outgoingBitrate: videoData.outbound[0].bitrate || 0,
                latency: videoRTT / 2,
                jitter: videoJitter,
                packetsLostOutbound: videoPacketsLostOutbound,
                packetsLostInbound: videoPacketsLostInbound,
                packetRateOutbound: videoPacketRateOutbound,
                packetRateInbound: videoPacketRateInbound
            }
        };
        this.setState(state => {
            const videoGraphData = state.videoGraphData.concat(addData.video);
            const audioGraphData = state.audioGraphData.concat(addData.audio);
            videoGraphData.shift();
            audioGraphData.shift();
            return {
                videoGraphData,
                audioGraphData,
                lastData: stats.data
            };
        });
    }

    handleFullscreen(event) {
        event.preventDefault();
        this.toggleFullscreen(document.body);
    }

    handleRemoteVideoPlaying() {
        this.setState({ remoteVideoShow: true });
        this.remoteVideo.current.onresize = (event) => {
            this.handleRemoteResize(event)
        };
        this.armOverlayTimer();
    }

    handleRemoteResize(event, target) {
        //DEBUG("%o", event);
        const resolutions = ['1280x720', '960x540', '640x480', '640x360', '480x270', '320x180'];
        const videoResolution = event.target.videoWidth + 'x' + event.target.videoHeight;
        if (resolutions.indexOf(videoResolution) === -1) {
            this.setState({ remoteSharesScreen: true });
        } else {
            this.setState({ remoteSharesScreen: false });
        }
    }

    muteAudio(event) {
        event.preventDefault();
        const localStream = this.props.call.getLocalStreams()[0];
        if (localStream.getAudioTracks().length > 0) {
            const track = localStream.getAudioTracks()[0];
            if (this.state.audioMuted) {
                DEBUG('Unmute microphone');
                track.enabled = true;
                this.setState({ audioMuted: false });
            } else {
                DEBUG('Mute microphone');
                track.enabled = false;
                this.setState({ audioMuted: true });
            }
        }
    }

    muteVideo(event) {
        event.preventDefault();
        const localStream = this.props.call.getLocalStreams()[0];
        if (localStream.getVideoTracks().length > 0) {
            const track = localStream.getVideoTracks()[0];
            if (this.state.videoMuted) {
                DEBUG('Unmute camera');
                track.enabled = true;
                this.setState({ videoMuted: false });
            } else {
                DEBUG('Mute camera');
                track.enabled = false;
                this.setState({ videoMuted: true });
            }
        }
    }

    hangupCall(event) {
        event.preventDefault();
        this.props.hangupCall();
    }

    escalateToConference(participants) {
        this.props.escalateToConference(participants);
    }

    armOverlayTimer() {
        clearTimeout(this.overlayTimer);
        this.overlayTimer = setTimeout(() => {
            this.setState({ callOverlayVisible: false });
        }, 4000);
    }

    showCallOverlay() {
        if (!this.state.showChat && !this.state.showInlineChat) {
            if (this.state.remoteVideoShow) {
                if (!this.state.callOverlayVisible) {
                    this.setState({ callOverlayVisible: true });
                }
                this.armOverlayTimer();
            }
        }
    }

    toggleEscalateConferenceModal() {
        this.setState({
            callOverlayVisible: false,
            showEscalateConferenceModal: !this.state.showEscalateConferenceModal
        });
    }

    toggleSwitchMenu(event) {
        if (!event) {
            this.setState({
                showSwitchMenu: !this.state.showSwitchMenu,
                callOverlayVisible: true
            });
        } else {
            event.currentTarget.blur();
            this.setState({
                switchAnchor: event.currentTarget,
                showSwitchMenu: !this.state.showSwitchMenu,
                callOverlayVisible: true
            });
        }
        clearTimeout(this.overlayTimer);
    }

    toggleAudioSwitchMenu(event) {
        if (!event) {
            this.setState({
                showAudioSwitchMenu: !this.state.showAudioSwitchMenu,
                callOverlayVisible: true
            });
        } else {
            event.currentTarget.blur();
            this.setState({
                switchAnchor: event.currentTarget,
                showAudioSwitchMenu: !this.state.showAudioSwitchMenu,
                callOverlayVisible: true
            });
        }
        clearTimeout(this.overlayTimer);
    }

    toggleStatistics() {
        this.setState({
            showStatistics: !this.state.showStatistics
        });
    }

    toggleChatInCall() {
        if (!this.state.showChat) {
            this.setState({
                showChat: !this.state.showChat,
                callOverlayVisible: true
            });
            this.props.toggleChatInCall();
            clearTimeout(this.overlayTimer);
        }
    }

    toggleInlineChat() {
        this.setState({
            callOverlayVisible: true,
            showInlineChat: !this.state.showInlineChat
        });
        clearTimeout(this.overlayTimer);
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
        if (this.props.call == null) {
            return (<div></div>);
        }

        const localVideoClasses = clsx({
            'video-thumbnail': true,
            'mirror': !this.props.call.sharingScreen && !this.props.generatedVideoTrack,
            'hidden': !this.state.localVideoShow,
            'animated': true,
            'fadeIn': this.state.localVideoShow || this.state.videoMuted,
            'fadeOut': this.state.videoMuted,
            'fit': this.props.call.sharingScreen
        });

        const remoteVideoClasses = clsx({
            'poster': !this.state.remoteVideoShow,
            'animated': true,
            'fadeIn': this.state.remoteVideoShow,
            'large': true,
            'fit': this.state.remoteSharesScreen
        });

        let callButtons;
        let watermark;

        const callQuality = (
            <CallQuality
                videoData={this.state.videoGraphData}
                audioData={this.state.audioGraphData}
            />
        );

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

        const unreadMessages = (this.props.unreadMessages && this.props.unreadMessages.total - this.props.unreadMessages.call) || 0;
        const unreadCallMessages = this.props.unreadMessages && this.props.unreadMessages.call || 0;

        if (this.state.callOverlayVisible) {
            const muteButtonIcons = clsx({
                'fa': true,
                'fa-microphone': !this.state.audioMuted,
                'fa-microphone-slash': this.state.audioMuted
            });

            const muteVideoButtonIcons = clsx({
                'fa': true,
                'fa-video-camera': !this.state.videoMuted,
                'fa-video-camera-slash': this.state.videoMuted
            });

            const screenSharingButtonIcons = clsx({
                'fa': true,
                'fa-clone': true,
                'fa-flip-horizontal': true,
                'text-warning': this.props.call.sharingScreen
            });

            const fullScreenButtonIcons = clsx({
                'fa': true,
                'fa-expand': !this.isFullScreen(),
                'fa-compress': this.isFullScreen()
            });

            const commonButtonClasses = clsx({
                'btn': true,
                'btn-round': true,
                'btn-default': true
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

            const shareButtonClasses = clsx(
                commonButtonClasses,
                this.props.classes.sharingButton
            );

            const shareFileButtonIcons = clsx({
                'fa': true,
                'fa-upload': true
            });
            const buttons = [];

            if (!this.state.showChat) {
                buttons.push(
                    <button key="statisticsBtn" type="button" className={commonButtonClasses} onClick={this.toggleStatistics}>
                        <NetworkCheckIcon />
                    </button>
                );
            }
            buttons.push(<button key="escalateButton" type="button" className={commonButtonClasses} onClick={this.toggleEscalateConferenceModal}> <i className="fa fa-user-plus"></i> </button>);
            buttons.push(
                <div className="btn-container" key="video">
                    <button key="muteVideo" type="button" className={commonButtonClasses} onClick={this.muteVideo}> <i className={muteVideoButtonIcons}></i> </button>
                    <button key="videodevices" type="button" title="Select cameras" className={menuButtonClasses} onClick={this.toggleSwitchMenu}> <i className={menuButtonIcons}></i> </button>
                </div>
            );
            buttons.push(
                <div className="btn-container" key="audio">
                    <button key="muteAudio" type="button" className={commonButtonClasses} onClick={this.muteAudio}> <i className={muteButtonIcons}></i> </button>
                    <button key="audiodevices" type="button" title="Select audio devices" className={menuButtonClasses} onClick={this.toggleAudioSwitchMenu}> <i className={menuButtonIcons}></i> </button>
                </div>
            );
            buttons.push(<button key="shareScreen" type="button" title="Share screen" className={commonButtonClasses} onClick={this.props.shareScreen}><i className={screenSharingButtonIcons}></i></button>);
            if (this.isFullscreenSupported()) {
                buttons.push(<button key="fsButton" type="button" className={commonButtonClasses} onClick={this.handleFullscreen}> <i className={fullScreenButtonIcons}></i> </button>);
            }
            if (this.props.inlineChat) {
                buttons.push(<React.Fragment key="inlineChat">
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
                    </label></React.Fragment>);
            }
            buttons.push(<br key="break" />);
            buttons.push(<button key="hangupButton" type="button" className="btn btn-round-big btn-danger" onClick={this.hangupCall}> <i className="fa fa-phone rotate-135"></i> </button>);

            callButtons = (
                <CSSTransition
                    key="buttons"
                    classNames="videobuttons"
                    timeout={{ enter: 300, exit: 300 }}
                >
                    <div className="call-buttons">
                        {buttons}
                    </div>
                </CSSTransition>
            );
        } else {
            watermark = (
                <CSSTransition
                    key="watermark"
                    classNames="watermark"
                    timeout={{ enter: 600, exit: 300 }}
                >
                    <div className="watermark"></div>
                </CSSTransition>
            );
        }

        const callClasses = clsx({
            'drawer-wide-visible': this.state.showInlineChat && !this.state.showChat && !utils.isMobile.any(),
            'drawer-visible': this.state.showInlineChat && !this.state.showChat && utils.isMobile.any()
        });

        const topButtons = {
            top: {
                left: []
            }
        };

        if (this.props.toggleChatInCall !== undefined) {
            topButtons.top.left = [
                <Badge
                    key="unreadBadge"
                    badgeContent={unreadMessages}
                    color="primary"
                    classes={{ badge: this.props.classes.badge }}
                    overlap="circular"
                >
                    <button key="chatButton" type="button" className={chatButtonClasses} onClick={this.toggleChatInCall} title="Chat screen">
                        <i className="fa fa-comments fa-2x" />
                    </button>
                </Badge>
            ]
        }

        return (
            <React.Fragment>
                <DragAndDrop title="Drop files to share them" handleDrop={this.handleDrop}>
                    <div className={callClasses}>
                        <SwitchDevicesMenu
                            show={this.state.showSwitchMenu}
                            anchor={this.state.switchAnchor}
                            close={this.toggleSwitchMenu}
                            call={this.props.call}
                            setDevice={this.props.setDevice}
                            direction="up"
                        />
                        <SwitchDevicesMenu
                            show={this.state.showAudioSwitchMenu}
                            anchor={this.state.switchAnchor}
                            close={this.toggleAudioSwitchMenu}
                            call={this.props.call}
                            setDevice={this.props.setDevice}
                            direction="up"
                            audio
                        />
                        <div className="video-container" onMouseMove={this.showCallOverlay}>
                            <CallOverlay
                                show={this.state.callOverlayVisible}
                                remoteIdentity={this.props.call.remoteIdentity.displayName || this.props.call.remoteIdentity.uri}
                                call={this.props.call}
                                buttons={topButtons}
                                onTop={this.state.showChat}
                                callQuality={callQuality}
                            />
                            <TransitionGroup>
                                {watermark}
                            </TransitionGroup>
                            <video id="remoteVideo" className={remoteVideoClasses} poster="assets/images/transparent-1px.png" ref={this.remoteVideo} autoPlay />
                            <video id="localVideo" className={localVideoClasses} ref={this.localVideo} autoPlay muted />
                            <TransitionGroup>
                                {callButtons}
                            </TransitionGroup>
                            <EscalateConferenceModal
                                show={this.state.showEscalateConferenceModal}
                                call={this.props.call}
                                close={this.toggleEscalateConferenceModal}
                                escalateToConference={this.escalateToConference}
                            />
                        </div>
                        <ConferenceDrawer
                            show={this.state.showStatistics && !this.state.showChat}
                            anchor="left"
                            showClose={true}
                            close={this.toggleStatistics}
                            transparent={true}
                        >
                            <Statistics
                                videoData={this.state.videoGraphData}
                                audioData={this.state.audioGraphData}
                                lastData={this.state.lastData}
                                videoElements={{ remoteVideo: this.remoteVideo, localVideo: this.localVideo }}
                                video
                                details
                            />
                        </ConferenceDrawer>
                    </div>
                    <ConferenceDrawer
                        show={this.state.showInlineChat && !this.state.showChat}
                        anchor="right"
                        showClose={true}
                        close={this.toggleInlineChat}
                        size={utils.isMobile.any() ? 'normal' : 'wide'}
                        noBackgroundColor
                    >
                        {this.props.inlineChat}
                    </ConferenceDrawer>
                </DragAndDrop>
            </React.Fragment>
        );
    }
}

VideoBox.propTypes = {
    classes: PropTypes.object.isRequired,
    setDevice: PropTypes.func.isRequired,
    shareScreen: PropTypes.func.isRequired,
    call: PropTypes.object,
    localMedia: PropTypes.object,
    hangupCall: PropTypes.func,
    escalateToConference: PropTypes.func,
    generatedVideoTrack: PropTypes.bool,
    unreadMessages: PropTypes.object,
    notificationCenter: PropTypes.func,
    toggleChatInCall: PropTypes.func,
    inlineChat: PropTypes.object,
    propagateKeyPress: PropTypes.bool,
    remoteAudio: PropTypes.object
};

ReactMixin(VideoBox.prototype, FullscreenMixin);


module.exports = withStyles(styleSheet)(VideoBox);
