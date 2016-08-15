'use strict';

const React      = require('react');
const classNames = require('classnames');
const rtcninja   = require('sylkrtc').rtcninja;
const assert     = require('assert');
const Router     = require('react-mini-router');
const navigate   = Router.navigate;
const debug      = require('debug');

const AudioCallBox = require('./AudioCallBox');
const LocalMedia   = require('./LocalMedia');
const VideoBox     = require('./VideoBox');
const config       = require('../config');

const DEBUG = debug('blinkrtc:Call');


class Call extends React.Component {
    constructor(props) {
        super(props);

        if (this.props.localMedia.getVideoTracks().length === 0) {
            DEBUG('Will send audio only');
            this.state = {audioOnly: true};
        } else {
            this.state = {audioOnly: false};
        }

        // ES6 classes no longer autobind
        this.mediaPlaying = this.mediaPlaying.bind(this);
        this.callStateChanged = this.callStateChanged.bind(this);
        this.hangupCall = this.hangupCall.bind(this);

        // If current call is available on mount we must have incoming
        if (this.props.currentCall != null) {
            this.props.currentCall.on('stateChanged', this.callStateChanged);
        }
    }

    componentWillReceiveProps(nextProps) {
        // Needed for switching to incoming call while in a call
        if (this.props.currentCall != null && this.props.currentCall != nextProps.currentCall) {
            if (nextProps.currentCall != null) {
                nextProps.currentCall.on('stateChanged', this.callStateChanged);
            } else {
                this.props.currentCall.removeListener('stateChanged', this.callStateChanged);
            }
        }
    }

    callStateChanged(oldState, newState, data) {
        if (newState === 'established') {
            // Check the media type again, remote can choose to not accept all offered media types
            if (this.props.currentCall.getRemoteStreams()[0].getVideoTracks().length === 0 && !this.state.audioOnly) {
                DEBUG('Media type changed to audio');
                this.setState({audioOnly:true});
            } else {
                this.forceUpdate();
            }
            this.props.currentCall.removeListener('stateChanged', this.callStateChanged);
        }
    }

    startCall() {
        assert(this.props.currentCall === null, 'currentCall is not null');
        let options = {pcConfig: {iceServers: config.iceServers}};
        options.localStream = this.props.localMedia;
        let call = this.props.account.call(this.props.targetUri, options);
        call.on('stateChanged', this.callStateChanged);
    }

    answerCall() {
        assert(this.props.currentCall !== null, 'currentCall is null');
        let options = {pcConfig: {iceServers: config.iceServers}};
        options.localStream = this.props.localMedia;
        this.props.currentCall.answer(options);
    }

    hangupCall() {
        if (this.props.currentCall != null) {
            this.props.currentCall.terminate();
        } else {
            // We have no call but we still want to cancel
            rtcninja.closeMediaStream(this.props.localMedia);
            navigate('/ready');
        }
    }

    mediaPlaying() {
        if (this.props.currentCall == null) {
            this.startCall();
        } else {
            this.answerCall();
        }
    }

    render() {
        let box;
        let remoteIdentity;

        if (this.props.currentCall !== null) {
            remoteIdentity = this.props.currentCall.remoteIdentity.displayName || this.props.currentCall.remoteIdentity.uri;
        } else {
            remoteIdentity = this.props.targetUri;
        }

        if (this.props.localMedia !== null) {
            if (this.props.currentCall != null && this.props.currentCall.state === 'established') {
                if (this.state.audioOnly) {
                    box = (
                        <AudioCallBox
                            remoteIdentity = {remoteIdentity}
                            hangupCall = {this.hangupCall}
                            call = {this.props.currentCall}
                            mediaPlaying = {null}
                        />
                    );
                } else {
                    box = (
                        <VideoBox
                            call = {this.props.currentCall}
                            localMedia = {this.props.localMedia}
                            hangupCall = {this.hangupCall}
                        />
                    );
                }
            } else {
                if (this.state.audioOnly) {
                    box = (
                        <AudioCallBox
                            remoteIdentity = {remoteIdentity}
                            hangupCall = {this.hangupCall}
                            mediaPlaying = {this.mediaPlaying}
                        />
                    );
                } else {
                    box = (
                        <LocalMedia
                            remoteIdentity = {remoteIdentity}
                            localMedia = {this.props.localMedia}
                            mediaPlaying = {this.mediaPlaying}
                            hangupCall = {this.hangupCall}
                        />
                    );
                }
            }
        }
        return (
            <div>
                {box}
            </div>
        );
    }
}

Call.propTypes = {
    account     : React.PropTypes.object.isRequired,
    currentCall : React.PropTypes.object,
    localMedia  : React.PropTypes.object,
    targetUri   : React.PropTypes.string
};


module.exports = Call;
