'use strict';

const React                     = require('react');
const ReactCSSTransitionGroup   = require('react-addons-css-transition-group');
const rtcninja                  = require('sylkrtc').rtcninja;
const classNames                = require('classnames');
const debug                     = require('debug');
const moment                    = require('moment');
const momentFormat              = require('moment-duration-format');
const FullscreenMixin           = require('../mixins/FullScreen');

const AudioCallBox = require('./AudioCallBox');

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
            callDuration: null,
            localVideoShow: false,
            remoteVideoShow: false
        };
    },

    componentWillMount: function() {
        this.callAvail = false;
        if (this.props.localMedia.getVideoTracks().length === 0 ||
            this.props.call.getRemoteStreams()[0].getVideoTracks().length === 0) {
            DEBUG('Sending or receiving audio only');
            this.setState({
                audioOnly:true,
                hangupButtonVisible: true});
        }
    },

    componentDidMount: function() {
        this.callTimer = null;
        let remoteStream = this.props.call.getRemoteStreams()[0];
        if (!this.state.audioOnly) {
            this.refs.localVideo.addEventListener('loadeddata', this.showLocalVideoElement);
            this.refs.localVideo.oncontextmenu = function(e) {
                // disable right click for video elements
                e.preventDefault();
            };
            rtcninja.attachMediaStream(this.refs.localVideo, this.props.localMedia);
            this.refs.remoteVideo.addEventListener('loadeddata', this.showRemoteVideoElement);
            this.refs.remoteVideo.oncontextmenu = function(e) {
                // disable right click for video elements
                e.preventDefault();
            };
            rtcninja.attachMediaStream(this.refs.remoteVideo, remoteStream);
            this.hangupButtonTimer = null;
            this.armHangupTimer();
        } else {
            DEBUG('Audio only');
            rtcninja.attachMediaStream(this.refs.remoteAudio, remoteStream);
        }
        this.startCallTimer();
    },

    componentWillUnmount: function() {
        clearTimeout(this.hangupButtonTimer);
        clearTimeout(this.callTimer);

        if (!this.state.audioOnly) {
            this.refs.remoteVideo.removeEventListener('loadeddata', this.showRemoteVideoElement);
            this.refs.localVideo.removeEventListener('loadeddata', this.showLocalVideoElement);
        }

        this.exitFullscreen();
    },

    handleFullscreen: function (event) {
        event.preventDefault();
        this.toggleFullscreen(this.refs.videoContainer);
    },

    showLocalVideoElement: function() {
        this.setState({localVideoShow: true});
    },

    showRemoteVideoElement: function() {
        this.setState({remoteVideoShow: true});
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
        if (this.state.remoteVideoShow) {
            this.setState({hangupButtonVisible: true});
            this.armHangupTimer();
        }
    },

    render: function() {
        let callEstablished = this.state.callDuration !== null;

        const localVideoClasses = classNames({
            'video-thumbnail' : true,
            'mirror'          : true,
            'hidden'          : !this.state.localVideoShow,
            'animated'        : true,
            'fadeIn'          : this.state.localVideoShow || this.state.videoMuted,
            'fadeOut'         : this.state.videoMuted
        });

        let remoteVideoClasses = classNames({
            'hidden'        : !this.state.remoteVideoShow,
            'animated'      : true,
            'fadeIn'        : this.state.remoteVideoShow,
            'large'         : true
        });

        let remoteAudio;
        let remoteVideo;
        let localVideo;
        if (!this.state.audioOnly) {
            remoteVideo = <video id="remoteVideo" className={remoteVideoClasses} ref="remoteVideo" autoPlay />;
            localVideo  = <video className={localVideoClasses} id="localVideo" ref="localVideo" autoPlay muted/>;
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
            'fa-expand'     : !this.isFullScreen(),
            'fa-compress'   : this.isFullScreen()
        });

        let buttonBarClasses = classNames({
            'videoStarted'  : !this.state.audioOnly
        });

        let videoHeaderTextClasses = classNames({
            'lead'          : true,
            'text-success'  : true
        });

        let commonButtonClasses = classNames({
            'btn'           : true,
            'btn-round'     : true,
            'btn-default'   : true
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
                muteVideoButton = <button key="muteVideo" type="button" className={commonButtonClasses} onClick={this.muteVideo}> <i className={muteVideoButtonIcons}></i> </button>;
                if (this.isFullscreenSupported()) {
                    fullScreenButton = <button key="fsButton" type="button" className={commonButtonClasses} onClick={this.handleFullscreen}> <i className={fullScreenButtonIcons}></i> </button>;
                }
                videoHeader = (
                    <div key="header" className="videoHeader">
                        <p className={videoHeaderTextClasses}><strong>Call with</strong> {remoteIdentity}</p>
                        <p className={videoHeaderTextClasses}>{callDuration}</p>
                    </div>
                );
            }
            muteButton = <button key="muteAudio" type="button" className={commonButtonClasses} onClick={this.muteAudio}> <i className={muteButtonIcons}></i> </button>;
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
                    <AudioCallBox callDuration={callDuration} remoteIdentity={remoteIdentity} boxBsClass="success"/>
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
