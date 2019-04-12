'use strict';

const React      = require('react');
const PropTypes  = require('prop-types');
const classNames = require('classnames');
const assert     = require('assert');
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
            const currentCall = this.props.currentCall;
            const remoteHasStreams = currentCall.getRemoteStreams().length > 0;
            const remoteHasNoVideoTracks = currentCall.getRemoteStreams()[0].getVideoTracks().length === 0;
            const remoteIsRecvOnly = currentCall.remoteMediaDirections.video[0] === 'recvonly';
            const remoteIsInactive = currentCall.remoteMediaDirections.video[0] === 'inactive';

            if (remoteHasStreams && (remoteHasNoVideoTracks || remoteIsRecvOnly || remoteIsInactive) && !this.state.audioOnly) {
                DEBUG('Media type changed to audio');
                // Stop local video
                if (this.props.localMedia.getVideoTracks().length !== 0) {
                    currentCall.getLocalStreams()[0].getVideoTracks()[0].stop();
                }
                this.setState({audioOnly: true});
            } else {
                this.forceUpdate();
            }
            currentCall.removeListener('stateChanged', this.callStateChanged);
        // Switch to video earlier. The callOverlay has a handle on
        // 'established'. It starts a timer. To prevent a state updating on
        // unmounted component we try to switch on 'accept'. This means we get
        // to localMedia first.
        } else if (newState === 'accepted') {
            // Switch if we have audioOnly and local videotracks. This means
            // the call object switched and we are transitioning to an
            // incoming call.
            if (this.state.audioOnly && this.props.localMedia.getVideoTracks().length !== 0) {
                DEBUG('Media type changed to video on accepted');
                this.setState({audioOnly: false});
            }
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
        this.props.hangupCall();
    }

    mediaPlaying() {
        if (this.props.currentCall === null) {
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
            if (this.state.audioOnly) {
                box = (
                    <AudioCallBox
                        remoteIdentity = {remoteIdentity}
                        hangupCall = {this.hangupCall}
                        call = {this.props.currentCall}
                        mediaPlaying = {this.mediaPlaying}
                        escalateToConference = {this.props.escalateToConference}
                    />
                );
            } else {
                if (this.props.currentCall != null && this.props.currentCall.state === 'established') {
                    box = (
                        <VideoBox
                            call = {this.props.currentCall}
                            localMedia = {this.props.localMedia}
                            hangupCall = {this.hangupCall}
                            escalateToConference = {this.props.escalateToConference}
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
    account                 : PropTypes.object.isRequired,
    hangupCall              : PropTypes.func.isRequired,
    currentCall             : PropTypes.object,
    escalateToConference    : PropTypes.func,
    localMedia              : PropTypes.object,
    targetUri               : PropTypes.string
};


module.exports = Call;
