'use strict';

import React, { findDOMNode } from 'react';
import sylkrtc from 'sylkrtc';
import classNames from 'classnames';

var VideoBox = React.createClass({
    getInitialState() {
        return {
            audioOnly: false,
        };
    },
    componentDidMount() {
        let localStream = this.props.call.getLocalStreams()[0];
        if (localStream.getVideoTracks().length > 0) {
            let localVideoElement = React.findDOMNode(this.refs.localVideo);
            sylkrtc.attachMediaStream(localVideoElement, localStream);
        } else {
            console.log('Sending audio only');
            this.setState({audioOnly:true});
        }
        this.props.call.on('stateChanged', this.callStateChanged);
    },

    callStateChanged(oldState, newState, data) {
        if (newState === 'established') {
            let remoteStream = this.props.call.getRemoteStreams()[0];
            if (remoteStream.getVideoTracks().length > 0) {
                let remoteVideoElement = React.findDOMNode(this.refs.remoteVideo);
                sylkrtc.attachMediaStream(remoteVideoElement, remoteStream);
            } else {
                console.log('Receiving audio only');
                this.setState({audioOnly:true});
            }
        }
    },

    componentWillUnmount() {
        this.props.call.removeListener('stateChanged', this.callStateChanged);
    },

    hangupCall(event) {
        event.preventDefault();
        this.props.call.terminate();
    },

    showHangup() {
        console.log('show');
    },

    render() {
        let fullScreen = false;
        if (this.props.call !== null) {
            if (this.props.call.state === 'progress') {
                fullScreen = true;
            }
        }
        let classes = classNames({
            fullScreen: fullScreen,
            noFullScreen: fullScreen===false
        });
        let remoteVideo,localVideo;
        if (!this.state.audioOnly) {
            remoteVideo = <video id='remoteVideo' ref='remoteVideo' autoPlay />;
            localVideo = <video className={classes} id='localVideo' ref='localVideo' autoPlay />;
        }
        return (
            <div className='videoContainer' onMouseMove={this.showHangup}>
                {remoteVideo}
                {localVideo}
                {this.state.audioOnly && (<div><span className="fa-stack fa-4">
                    <i className="fa fa-volume-off move-icon fa-stack-2x"></i>
                    <i className="move-icon2 fa fa-volume-up fa-stack-2x animate-sound1"></i></span></div>
                )}
                <button type='button' className="btn btn-lg btn-danger videoStarted" onClick={this.hangupCall}> <i className='fa fa-phone rotate-135'></i> </button>
            </div>
        );
    },
});

module.exports = VideoBox;
