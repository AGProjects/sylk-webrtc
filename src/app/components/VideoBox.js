'use strict';

const React                     = require('react');
const PropTypes                 = require('prop-types');
const TransitionGroup           = require('react-transition-group/TransitionGroup');
const CSSTransition             = require('react-transition-group/CSSTransition');
const ReactMixin                = require('react-mixin');
const sylkrtc                   = require('sylkrtc');
const { default: clsx }         = require('clsx');
const debug                     = require('debug');

const FullscreenMixin           = require('../mixins/FullScreen');
const CallOverlay               = require('./CallOverlay');
const SwitchDevicesMenu         = require('./SwitchDevicesMenu');
const EscalateConferenceModal   = require('./EscalateConferenceModal');


const DEBUG = debug('blinkrtc:Video');


class VideoBox extends React.Component {
    constructor(props) {
        super(props);
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
            showAudioSwitchMenu: false
        };

        this.overlayTimer = null;
        this.localVideo = React.createRef();
        this.remoteVideo = React.createRef();
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
            'escalateToConference'
        ].forEach((name) => {
            this[name] = this[name].bind(this);
        });
    }

    componentDidMount() {
        sylkrtc.utils.attachMediaStream(this.props.call.getLocalStreams()[0], this.localVideo.current, {disableContextMenu: true, muted: true});
        let promise =  this.localVideo.current.play()
        if (promise !== undefined) {
            promise.then(_ => {
                this.setState({localVideoShow: true});    // eslint-disable-line react/no-did-mount-set-state
                // Autoplay started!
            }).catch(error => {
                // Autoplay was prevented.
                // Show a "Play" button so that user can start playback.
            });
        } else {
            this.localVideo.current.addEventListener('playing', () => {
                this.setState({localVideoShow: true});    // eslint-disable-line react/no-did-mount-set-state
            });
        }

        this.remoteVideo.current.addEventListener('playing', this.handleRemoteVideoPlaying);
        sylkrtc.utils.attachMediaStream(this.props.call.getRemoteStreams()[0], this.remoteVideo.current, {disableContextMenu: true});

        document.addEventListener('keydown', this.onKeyDown);
    }

    componentWillUnmount() {
        clearTimeout(this.overlayTimer);
        this.remoteVideo.current.removeEventListener('playing', this.handleRemoteVideoPlaying);
        this.exitFullscreen();
        document.removeEventListener('keydown', this.onKeyDown);
    }

    onKeyDown(event) {
        if (!this.state.showEscalateConferenceModal) {
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
                    setTimeout(() => {this.forceUpdate()}, 100);
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

    handleFullscreen(event) {
        event.preventDefault();
        this.toggleFullscreen(document.body);
    }

    handleRemoteVideoPlaying() {
        this.setState({remoteVideoShow: true});
        this.remoteVideo.current.onresize = (event) => {
            this.handleRemoteResize(event)
        };
        this.armOverlayTimer();
    }

    handleRemoteResize(event, target) {
        //DEBUG("%o", event);
        const resolutions = [ '1280x720', '960x540', '640x480', '640x360', '480x270','320x180'];
        const videoResolution = event.target.videoWidth + 'x' + event.target.videoHeight;
        if (resolutions.indexOf(videoResolution) === -1) {
            this.setState({remoteSharesScreen: true});
        } else {
            this.setState({remoteSharesScreen: false});
        }
    }

    muteAudio(event) {
        event.preventDefault();
        const localStream = this.props.call.getLocalStreams()[0];
        if (localStream.getAudioTracks().length > 0) {
            const track = localStream.getAudioTracks()[0];
            if(this.state.audioMuted) {
                DEBUG('Unmute microphone');
                track.enabled = true;
                this.setState({audioMuted: false});
            } else {
                DEBUG('Mute microphone');
                track.enabled = false;
                this.setState({audioMuted: true});
            }
        }
    }

    muteVideo(event) {
        event.preventDefault();
        const localStream = this.props.call.getLocalStreams()[0];
        if (localStream.getVideoTracks().length > 0) {
            const track = localStream.getVideoTracks()[0];
            if(this.state.videoMuted) {
                DEBUG('Unmute camera');
                track.enabled = true;
                this.setState({videoMuted: false});
            } else {
                DEBUG('Mute camera');
                track.enabled = false;
                this.setState({videoMuted: true});
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
            this.setState({callOverlayVisible: false});
        }, 4000);
    }

    showCallOverlay() {
        if (this.state.remoteVideoShow) {
            if (!this.state.callOverlayVisible) {
                this.setState({callOverlayVisible: true});
            }
            this.armOverlayTimer();
        }
    }

    toggleEscalateConferenceModal() {
        this.setState({
            callOverlayVisible          : false,
            showEscalateConferenceModal : !this.state.showEscalateConferenceModal
        });
    }

    toggleSwitchMenu(event) {
        if (!event) {
            this.setState({
                showSwitchMenu : !this.state.showSwitchMenu,
                callOverlayVisible: true
            });
        } else {
            event.currentTarget.blur();
            this.setState({
                switchAnchor: event.currentTarget,
                showSwitchMenu : !this.state.showSwitchMenu,
                callOverlayVisible: true
            });
        }
        clearTimeout(this.overlayTimer);
    }

    toggleAudioSwitchMenu(event) {
        if (!event) {
            this.setState({
                showAudioSwitchMenu : !this.state.showAudioSwitchMenu,
                callOverlayVisible: true
            });
        } else {
            event.currentTarget.blur();
            this.setState({
                switchAnchor: event.currentTarget,
                showAudioSwitchMenu : !this.state.showAudioSwitchMenu,
                callOverlayVisible: true
            });
        }
        clearTimeout(this.overlayTimer);
    }

    render() {
        if (this.props.call == null) {
            return (<div></div>);
        }

        const localVideoClasses = clsx({
            'video-thumbnail' : true,
            'mirror'          : !this.props.call.sharingScreen && !this.props.generatedVideoTrack,
            'hidden'          : !this.state.localVideoShow,
            'animated'        : true,
            'fadeIn'          : this.state.localVideoShow || this.state.videoMuted,
            'fadeOut'         : this.state.videoMuted,
            'fit'             : this.props.call.sharingScreen
        });

        const remoteVideoClasses = clsx({
            'poster'        : !this.state.remoteVideoShow,
            'animated'      : true,
            'fadeIn'        : this.state.remoteVideoShow,
            'large'         : true,
            'fit'           : this.state.remoteSharesScreen
        });

        let callButtons;
        let watermark;

        if (this.state.callOverlayVisible) {
            const muteButtonIcons = clsx({
                'fa'                    : true,
                'fa-microphone'         : !this.state.audioMuted,
                'fa-microphone-slash'   : this.state.audioMuted
            });

            const muteVideoButtonIcons = clsx({
                'fa'                    : true,
                'fa-video-camera'       : !this.state.videoMuted,
                'fa-video-camera-slash' : this.state.videoMuted
            });

            const screenSharingButtonIcons = clsx({
                'fa'                    : true,
                'fa-clone'              : true,
                'fa-flip-horizontal'    : true,
                'text-warning'          : this.props.call.sharingScreen
            });

            const fullScreenButtonIcons = clsx({
                'fa'            : true,
                'fa-expand'     : !this.isFullScreen(),
                'fa-compress'   : this.isFullScreen()
            });

            const commonButtonClasses = clsx({
                'btn'           : true,
                'btn-round'     : true,
                'btn-default'   : true
            });

            const menuButtonClasses = clsx({
                'btn'          : true,
                'btn-round-xs' : true,
                'btn-default'  : true,
                'overlap'      : true,
                'overlap-top'  : true
            });

            const menuButtonIcons = clsx({
                'fa'           : true,
                'fa-caret-up'  : true
            });

            const buttons = [];

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
            buttons.push(<br key="break" />);
            buttons.push(<button key="hangupButton" type="button" className="btn btn-round-big btn-danger" onClick={this.hangupCall}> <i className="fa fa-phone rotate-135"></i> </button>);

            callButtons = (
                <CSSTransition
                    key="buttons"
                    classNames="videobuttons"
                    timeout={{ enter: 300, exit: 300}}
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
                    timeout={{enter: 600, exit: 300}}
                >
                    <div className="watermark"></div>
                </CSSTransition>
            );
        }

        return (
            <div>
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
                        show = {this.state.callOverlayVisible}
                        remoteIdentity = {this.props.call.remoteIdentity.displayName || this.props.call.remoteIdentity.uri}
                        call = {this.props.call}
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
            </div>
        );
    }
}

VideoBox.propTypes = {
    setDevice               : PropTypes.func.isRequired,
    shareScreen             : PropTypes.func.isRequired,
    call                    : PropTypes.object,
    localMedia              : PropTypes.object,
    hangupCall              : PropTypes.func,
    escalateToConference    : PropTypes.func,
    generatedVideoTrack     : PropTypes.bool
};

ReactMixin(VideoBox.prototype, FullscreenMixin);


module.exports = VideoBox;
