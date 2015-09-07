'use strict';

const React      = require('react');
const sylkrtc    = require('sylkrtc');
const classNames = require('classnames');
const debug      = require('debug');
const FullscreenMixin = require('../mixins/FullScreen.js');

const DEBUG = debug('blinkrtc:Video');


let VideoBox = React.createClass({
    mixins: [FullscreenMixin],

    getInitialState: function() {
        return {
            audioOnly: false,
            hangupButtonVisible: true,
            audioMuted: false
        };
    },

    componentDidMount: function() {
        let localStream = this.props.call.getLocalStreams()[0];
        if (localStream.getVideoTracks().length > 0) {
            let localVideoElement = React.findDOMNode(this.refs.localVideo);
            sylkrtc.attachMediaStream(localVideoElement, localStream);
        } else {
            DEBUG('Sending audio only');
            this.setState({audioOnly:true});
        }
        this.props.call.on('stateChanged', this.callStateChanged);
        this.hangupButtonTimer = null;
        this.armHangupTimer();
    },

    callStateChanged: function(oldState, newState, data) {
        if (newState === 'established') {
            let remoteStream = this.props.call.getRemoteStreams()[0];
            if (remoteStream.getVideoTracks().length > 0) {
                let remoteVideoElement = React.findDOMNode(this.refs.remoteVideo);
                sylkrtc.attachMediaStream(remoteVideoElement, remoteStream);
            } else {
                DEBUG('Receiving audio only');
                this.setState({audioOnly:true});
                let remoteAudioElement = React.findDOMNode(this.refs.remoteAudio);
                sylkrtc.attachMediaStream(remoteAudioElement, remoteStream);
            }
        }
    },

    componentWillUnmount: function() {
        clearTimeout(this.hangupButtonTimer);
        this.props.call.removeListener('stateChanged', this.callStateChanged);
        if (this.state.isFullscreen) {
            this.exitFullscreen();
        }
    },

    toggleFullscreen: function (event, ref) {
        event.preventDefault();
        this.state.isFullscreen ? this.exitFullscreen() : this.requestFullscreen(ref ? ref : this.refs.videoContainer);
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

    hangupCall: function(event) {
        event.preventDefault();
        this.props.call.terminate();
    },

    armHangupTimer: function() {
        clearTimeout(this.hangupButtonTimer);
        this.hangupButtonTimer = setTimeout(() => {
            this.setState({hangupButtonVisible: false});
        }, 4000);
    },

    showHangup: function() {
        this.setState({hangupButtonVisible: true});
        this.armHangupTimer();
    },

    render: function() {
        let fullScreen = false;
        if (this.props.call !== null) {
            if (this.props.call.state === 'progress') {
                fullScreen = true;
            }
        }
        let classes = classNames({
            fullScreen: fullScreen,
            noFullScreen: fullScreen === false
        });
        let remoteAudio;
        let remoteVideo;
        let localVideo;
        if (!this.state.audioOnly) {
            remoteVideo = <video id='remoteVideo' ref='remoteVideo' autoPlay />;
            localVideo  = <video className={classes} id='localVideo' ref='localVideo' autoPlay muted/>;
        } else {
            remoteAudio = <audio id='remoteAudio' ref='remoteAudio' autoPlay />;
        }

        let hangupButton;
        let fullScreenButton;
        let muteButton;
        let muteButtonIcons = classNames({
            'fa'                    : true,
            'fa-microphone'         : !this.state.audioMuted,
            'fa-microphone-slash'   : this.state.audioMuted
        });
        let fullScreenButtonIcons = classNames({
            'fa'            : true,
            'fa-expand'     : !this.state.isFullscreen,
            'fa-compress'   : this.state.isFullscreen
        });
        if (this.state.hangupButtonVisible) {
            muteButton = <button type='button' className="btn btn-round btn-default" onClick={this.muteAudio}> <i className={muteButtonIcons}></i> </button>;
            hangupButton = <button type='button' className="btn btn-round-big btn-danger" onClick={this.hangupCall}> <i className='fa fa-phone rotate-135'></i> </button>;
            fullScreenButton = <button type='button' className="btn btn-round btn-default" onClick={this.toggleFullscreen}> <i className={fullScreenButtonIcons}></i> </button>;
        }
        return (
            <div className='videoContainer'  ref='videoContainer' onMouseMove={this.showHangup}>
                {remoteAudio}
                {remoteVideo}
                {localVideo}
                {this.state.audioOnly && (<div><span className="fa-stack fa-4">
                    <i className="fa fa-volume-off move-icon fa-stack-2x"></i>
                    <i className="move-icon2 fa fa-volume-up fa-stack-2x animate-sound1"></i></span></div>
                )}
                <div className='videoStarted'>
                    {muteButton}
                    {hangupButton}
                    {fullScreenButton}
                </div>
            </div>
        );
    },
});

module.exports = VideoBox;
