'use strict';

const React                     = require('react');
const ReactDOM                  = require('react-dom');
const ReactCSSTransitionGroup   = require('react-addons-css-transition-group');
const rtcninja                  = require('sylkrtc').rtcninja;
const classNames                = require('classnames');
const debug                     = require('debug');
const moment                    = require('moment');
const momentFormat              = require('moment-duration-format');
const FullscreenMixin           = require('../mixins/FullScreen');

const DEBUG = debug('blinkrtc:Video');


let VideoBox = React.createClass({
    propTypes: {
        call: React.PropTypes.object.isRequired
    },

    mixins: [FullscreenMixin],

    getInitialState: function() {
        return {
            audioOnly: false,
            hangupButtonVisible: true,
            audioMuted: false,
            videoMuted: false,
            callDuration: null
        };
    },

    componentDidMount: function() {
        this.callTimer = null;
        let localStream = this.props.call.getLocalStreams()[0];
        if (localStream.getVideoTracks().length > 0) {
            let localVideoElement = ReactDOM.findDOMNode(this.refs.localVideo);
            localVideoElement.oncontextmenu = function(e) {
                // disable right click for video elements
                e.preventDefault();
            };
            rtcninja.attachMediaStream(localVideoElement, localStream);
        } else {
            DEBUG('Sending audio only');
            this.setState({audioOnly:true});
        }
        this.props.call.on('stateChanged', this.callStateChanged);
    },

    callStateChanged: function(oldState, newState, data) {
        if (newState === 'established') {
            let remoteStream = this.props.call.getRemoteStreams()[0];
            if (remoteStream.getVideoTracks().length > 0) {
                let remoteVideoElement = ReactDOM.findDOMNode(this.refs.remoteVideo);
                remoteVideoElement.oncontextmenu = function(e) {
                    // disable right click for video elements
                    e.preventDefault();
                };
                rtcninja.attachMediaStream(remoteVideoElement, remoteStream);
                this.hangupButtonTimer = null;
                this.armHangupTimer();
            } else {
                DEBUG('Receiving audio only');
                this.setState({audioOnly:true});
                let remoteAudioElement = ReactDOM.findDOMNode(this.refs.remoteAudio);
                rtcninja.attachMediaStream(remoteAudioElement, remoteStream);
            }
            this.startCallTimer();
        }
    },

    componentWillUnmount: function() {
        clearTimeout(this.hangupButtonTimer);
        clearTimeout(this.callTimer);
        this.props.call.removeListener('stateChanged', this.callStateChanged);
        if (this.state.isFullscreen) {
            this.exitFullscreen();
        }
    },

    toggleFullscreen: function (event, ref) {
        event.preventDefault();
        if (this.state.isFullscreen) {
            this.exitFullscreen();
        } else {
            this.requestFullscreen(this.refs.videoContainer);
        }
    },

    muteAudio: function(event) {
        event.preventDefault();
        let localStream = this.props.call.getLocalStreams()[0];
        if (localStream.getAudioTracks().length > 0) {
            if(this.state.audioMuted) {
                DEBUG('Unmute microphone');
                localStream.getAudioTracks()[0].enabled = true;
                this.setState({audioMuted: false});
            } else {
                DEBUG('Mute microphone');
                localStream.getAudioTracks()[0].enabled = false;
                this.setState({audioMuted: true});
            }
        }
    },

    muteVideo: function(event) {
        event.preventDefault();
        let localStream = this.props.call.getLocalStreams()[0];
        if (localStream.getVideoTracks().length > 0) {
            if(this.state.videoMuted) {
                DEBUG('Unmute camera');
                localStream.getVideoTracks()[0].enabled = true;
                this.setState({videoMuted: false});
            } else {
                DEBUG('Mute camera');
                localStream.getVideoTracks()[0].enabled = false;
                this.setState({videoMuted: true});
            }
        }
    },

    hangupCall: function(event) {
        event.preventDefault();
        this.props.call.terminate();
    },

    startCallTimer: function() {
        let startTime = new Date();
        this.callTimer = setInterval(() => {
            let duration = moment.duration(new Date() - startTime).format('hh:mm:ss', {trim: false});
            this.setState({callDuration: duration});
        }, 300);
    },

    armHangupTimer: function() {
        if (!this.state.audioOnly) {
            clearTimeout(this.hangupButtonTimer);
            this.hangupButtonTimer = setTimeout(() => {
                this.setState({hangupButtonVisible: false});
            }, 4000);
        }
    },

    showHangup: function() {
        this.setState({hangupButtonVisible: true});
        this.armHangupTimer();
    },

    render: function() {

        let classes = classNames({
            'fullScreen'    : this.props.call.state === 'progress',
            'noFullScreen'  : this.props.call.state !== 'progress',
            'hidden'        : this.state.videoMuted
        });
        let remoteAudio;
        let remoteVideo;
        let localVideo;
        if (!this.state.audioOnly) {
            remoteVideo = <video id="remoteVideo" ref="remoteVideo" autoPlay />;
            localVideo  = <video className={classes} id="localVideo" ref="localVideo" autoPlay muted/>;
        } else {
            remoteAudio = <audio id="remoteAudio" ref="remoteAudio" autoPlay />;
        }

        let hangupButton;
        let fullScreenButton;
        let muteButton;
        let muteVideoButton;
        let videoHeader;
        let muteButtonIcons = classNames({
            'fa'                    : true,
            'fa-microphone'         : !this.state.audioMuted,
            'fa-microphone-slash'   : this.state.audioMuted
        });
        let muteVideoButtonIcons = classNames({
            'fa'                    : true,
            'fa-video-camera'       : !this.state.videoMuted,
            'fa-video-camera-slash' : this.state.videoMuted
        });
        let fullScreenButtonIcons = classNames({
            'fa'            : true,
            'fa-expand'     : !this.state.isFullscreen,
            'fa-compress'   : this.state.isFullscreen
        });
        let buttonBarClasses = classNames({
            'videoStarted'  : !this.state.audioOnly
        });
        let audioCallDisplayClasses = classNames({
            'alert'         : true,
            'alert-info'    : this.props.call.state !== 'established',
            'alert-success' : this.props.call.state === 'established'
        });
        let videoHeaderTextClasses = classNames({
            'lead'          : true,
            'text-info'     : this.props.call.state !== 'established',
            'text-success'  : this.props.call.state === 'established'
        });

        let callDuration;
        if (this.state.callDuration !== null) {
            callDuration = <span><i className="fa fa-clock-o"></i> {this.state.callDuration}</span>;
        }

        if (this.state.hangupButtonVisible) {
            if (!this.state.audioOnly) {
                muteVideoButton = <button key="muteVideo" type="button" className="btn btn-round btn-default" onClick={this.muteVideo}> <i className={muteVideoButtonIcons}></i> </button>;
                fullScreenButton = <button key="fsButton" type="button" className="btn btn-round btn-default" onClick={this.toggleFullscreen}> <i className={fullScreenButtonIcons}></i> </button>;
                videoHeader =  <div key="header" className="videoHeader"><p className={videoHeaderTextClasses}><strong>Call with</strong> {this.props.call.remoteIdentity}</p><p className={videoHeaderTextClasses}>{callDuration}</p></div>;
            }
            muteButton = <button key="muteAudio" type="button" className="btn btn-round btn-default" onClick={this.muteAudio}> <i className={muteButtonIcons}></i> </button>;
            hangupButton = <button key="hangupButton" type="button" className="btn btn-round-big btn-danger" onClick={this.hangupCall}> <i className="fa fa-phone rotate-135"></i> </button>;
        }

        return (
            <div className="videoContainer" ref="videoContainer" onMouseMove={this.showHangup}>
                <ReactCSSTransitionGroup transitionName="videoheader">
                    {videoHeader}
                </ReactCSSTransitionGroup>
                {remoteAudio}
                {remoteVideo}
                {localVideo}
                {this.state.audioOnly && (
                    <div>
                        <span className="fa-stack fa-4">
                            <i className="fa fa-volume-off move-icon fa-stack-2x"></i>
                            <i className="move-icon2 fa fa-volume-up fa-stack-2x animate-sound1"></i>
                        </span>
                        <div className="cover-container">
                            <div className="inner cover halfWidth">
                                <div className={audioCallDisplayClasses} role="alert">
                                    <div className="row">
                                        <div className="pull-left padding-left">
                                            <strong>Call with</strong> {this.props.call.remoteIdentity}
                                        </div>
                                        <div className="pull-right padding-right">{callDuration}</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
                <div className={buttonBarClasses}>
                    <ReactCSSTransitionGroup transitionName="videobuttons">
                        {muteVideoButton}
                        {muteButton}
                        {fullScreenButton}
                        <br />
                        {hangupButton}
                    </ReactCSSTransitionGroup>
                </div>
            </div>
        );
    }
});

module.exports = VideoBox;
