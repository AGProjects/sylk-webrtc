'use strict';

const React                     = require('react');
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
        call: React.PropTypes.object,
        localMedia: React.PropTypes.object
    },

    mixins: [FullscreenMixin],

    getDefaultProps: function() {
        return {
          call: ''
        };
    },

    getInitialState: function() {
        return {
            audioOnly: false,
            hangupButtonVisible: true,
            audioMuted: false,
            videoMuted: false,
            callDuration: null
        };
    },

    componentWillMount: function() {
        this.callAvail = false;
        if (this.props.localMedia.getVideoTracks().length === 0) {
            DEBUG('Sending audio only');
            this.setState({audioOnly:true});
        }
    },

    componentDidMount: function() {
        this.callTimer = null;
        if (!this.state.audioOnly) {
            this.refs.localVideo.oncontextmenu = function(e) {
                // disable right click for video elements
                e.preventDefault();
            };
            rtcninja.attachMediaStream(this.refs.localVideo, this.props.localMedia);
        }
    },

    componentWillReceiveProps: function(nextProps) {
        if (nextProps.call !== null && !this.callAvail) {
            this.callAvail = true;
            nextProps.call.on('stateChanged', this.callStateChanged);
        }
    },

    callStateChanged: function(oldState, newState, data) {
        if (newState === 'established') {
            let remoteStream = this.props.call.getRemoteStreams()[0];
            if (remoteStream.getVideoTracks().length > 0) {
                this.refs.remoteVideo.oncontextmenu = function(e) {
                    // disable right click for video elements
                    e.preventDefault();
                };
                rtcninja.attachMediaStream(this.refs.remoteVideo, remoteStream);
                this.hangupButtonTimer = null;
                this.armHangupTimer();
            } else {
                DEBUG('Receiving audio only');
                this.setState({
                    audioOnly:true,
                    hangupButtonVisible: true
                });
                rtcninja.attachMediaStream(this.refs.remoteAudio, remoteStream);
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

    handleFullscreen: function (event) {
        event.preventDefault();
        this.toggleFullscreen(this.refs.videoContainer);
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
            'fullScreen'    : this.state.callDuration === null,
            'noFullScreen'  : this.state.callDuration !== null,
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
            'alert-info'    : this.state.callDuration === null,
            'alert-success' : this.state.callDuration !== null
        });
        let videoHeaderTextClasses = classNames({
            'lead'          : true,
            'text-info'     : this.state.callDuration === null,
            'text-success'  : this.state.callDuration !== null
        });

        let callDuration;
        if (this.state.callDuration !== null) {
            callDuration = <span><i className="fa fa-clock-o"></i> {this.state.callDuration}</span>;
        }

        let remoteIdentity = '';
        if (this.props.call !== null) {
            remoteIdentity = this.props.call.remoteIdentity.toString();
        }

        if (this.state.hangupButtonVisible) {
            if (!this.state.audioOnly) {
                muteVideoButton = <button key="muteVideo" type="button" className="btn btn-round btn-default" onClick={this.muteVideo}> <i className={muteVideoButtonIcons}></i> </button>;
                if (this.isFullscreenSupported()) {
                    fullScreenButton = <button key="fsButton" type="button" className="btn btn-round btn-default" onClick={this.handleFullscreen}> <i className={fullScreenButtonIcons}></i> </button>;
                }
                videoHeader =  <div key="header" className="videoHeader"><p className={videoHeaderTextClasses}><strong>Call with</strong> {remoteIdentity}</p><p className={videoHeaderTextClasses}>{callDuration}</p></div>;
            }
            muteButton = <button key="muteAudio" type="button" className="btn btn-round btn-default" onClick={this.muteAudio}> <i className={muteButtonIcons}></i> </button>;
            hangupButton = <button key="hangupButton" type="button" className="btn btn-round-big btn-danger" onClick={this.hangupCall}> <i className="fa fa-phone rotate-135"></i> </button>;
        }

        return (
            <div className="videoContainer" ref="videoContainer" onMouseMove={this.showHangup}>
                <ReactCSSTransitionGroup transitionName="videoheader" transitionEnterTimeout={300} transitionLeaveTimeout={300}>
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
                                            <strong>Call with</strong> {remoteIdentity}
                                        </div>
                                        <div className="pull-right padding-right">{callDuration}</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
                <div className={buttonBarClasses}>
                    <ReactCSSTransitionGroup transitionName="videobuttons" transitionEnterTimeout={300} transitionLeaveTimeout={300}>
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
