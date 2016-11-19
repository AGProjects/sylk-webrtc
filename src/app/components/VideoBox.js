'use strict';

const React                     = require('react');
const ReactCSSTransitionGroup   = require('react-addons-css-transition-group');
const ReactMixin                = require('react-mixin');
const attachMediaStream         = require('attachmediastream');
const classNames                = require('classnames');
const debug                     = require('debug');

const FullscreenMixin           = require('../mixins/FullScreen');
const CallOverlay               = require('./CallOverlay');


const DEBUG = debug('blinkrtc:Video');


class VideoBox extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            callOverlayVisible: true,
            audioMuted: false,
            videoMuted: false,
            localVideoShow: false,
            remoteVideoShow: false
        };

        this.overlayTimer = null;

        // ES6 classes no longer autobind
        [
            'showCallOverlay',
            'handleFullscreen',
            'handleRemoteVideoPlaying',
            'muteAudio',
            'muteVideo',
            'hangupCall'
        ].forEach((name) => {
            this[name] = this[name].bind(this);
        });
    }

    componentDidMount() {
        this.refs.localVideo.addEventListener('playing', () => {
            this.setState({localVideoShow: true});    // eslint-disable-line react/no-did-mount-set-state
        });
        attachMediaStream(this.props.localMedia, this.refs.localVideo, {disableContextMenu: true});

        this.refs.remoteVideo.addEventListener('playing', this.handleRemoteVideoPlaying);
        attachMediaStream(this.props.call.getRemoteStreams()[0], this.refs.remoteVideo, {disableContextMenu: true});
    }

    componentWillUnmount() {
        clearTimeout(this.overlayTimer);
        this.refs.remoteVideo.removeEventListener('playing', this.handleRemoteVideoPlaying);
        this.exitFullscreen();
    }

    handleFullscreen(event) {
        event.preventDefault();
        this.toggleFullscreen(document.body);
    }

    handleRemoteVideoPlaying() {
        this.setState({remoteVideoShow: true});
        this.armOverlayTimer();
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

    armOverlayTimer() {
        clearTimeout(this.overlayTimer);
        this.overlayTimer = setTimeout(() => {
            this.setState({callOverlayVisible: false});
        }, 4000);
    }

    showCallOverlay() {
        if (this.state.remoteVideoShow) {
            this.setState({callOverlayVisible: true});
            this.armOverlayTimer();
        }
    }

    render() {
        if (this.props.call == null) {
            return (<div></div>);
        }

        const localVideoClasses = classNames({
            'video-thumbnail' : true,
            'mirror'          : true,
            'hidden'          : !this.state.localVideoShow,
            'animated'        : true,
            'fadeIn'          : this.state.localVideoShow || this.state.videoMuted,
            'fadeOut'         : this.state.videoMuted
        });

        const remoteVideoClasses = classNames({
            'poster'        : !this.state.remoteVideoShow,
            'animated'      : true,
            'fadeIn'        : this.state.remoteVideoShow,
            'large'         : true
        });

        let callButtons;
        let watermark;

        if (this.state.callOverlayVisible) {
            const muteButtonIcons = classNames({
                'fa'                    : true,
                'fa-microphone'         : !this.state.audioMuted,
                'fa-microphone-slash'   : this.state.audioMuted
            });

            const muteVideoButtonIcons = classNames({
                'fa'                    : true,
                'fa-video-camera'       : !this.state.videoMuted,
                'fa-video-camera-slash' : this.state.videoMuted
            });

            const fullScreenButtonIcons = classNames({
                'fa'            : true,
                'fa-expand'     : !this.isFullScreen(),
                'fa-compress'   : this.isFullScreen()
            });

            const commonButtonClasses = classNames({
                'btn'           : true,
                'btn-round'     : true,
                'btn-default'   : true
            });

            const buttons = [];

            buttons.push(<button key="muteVideo" type="button" className={commonButtonClasses} onClick={this.muteVideo}> <i className={muteVideoButtonIcons}></i> </button>);
            buttons.push(<button key="muteAudio" type="button" className={commonButtonClasses} onClick={this.muteAudio}> <i className={muteButtonIcons}></i> </button>);
            if (this.isFullscreenSupported()) {
                buttons.push(<button key="fsButton" type="button" className={commonButtonClasses} onClick={this.handleFullscreen}> <i className={fullScreenButtonIcons}></i> </button>);
            }
            buttons.push(<br />);
            buttons.push(<button key="hangupButton" type="button" className="btn btn-round-big btn-danger" onClick={this.hangupCall}> <i className="fa fa-phone rotate-135"></i> </button>);

            callButtons = (
                <div className="call-buttons">
                    {buttons}
                </div>
            );
        } else {
            watermark = <div className="watermark"></div>;
        }

        return (
            <div className="video-container" onMouseMove={this.showCallOverlay}>
                <CallOverlay
                    show = {this.state.callOverlayVisible}
                    remoteIdentity = {this.props.call.remoteIdentity.displayName || this.props.call.remoteIdentity.uri}
                    call = {this.props.call}
                />
                <ReactCSSTransitionGroup transitionName="watermark" transitionEnterTimeout={600} transitionLeaveTimeout={300}>
                    {watermark}
                </ReactCSSTransitionGroup>
                <video id="remoteVideo" className={remoteVideoClasses} poster="assets/images/transparent-1px.png" ref="remoteVideo" autoPlay />
                <video id="localVideo" className={localVideoClasses} ref="localVideo" autoPlay muted/>
                <ReactCSSTransitionGroup transitionName="videobuttons" transitionEnterTimeout={300} transitionLeaveTimeout={300}>
                    {callButtons}
                </ReactCSSTransitionGroup>
            </div>
        );
    }
}

VideoBox.propTypes = {
    call: React.PropTypes.object,
    localMedia: React.PropTypes.object,
    hangupCall: React.PropTypes.func
};

ReactMixin(VideoBox.prototype, FullscreenMixin);


module.exports = VideoBox;
