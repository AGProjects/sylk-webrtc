'use strict';

const React = require('react');
const PropTypes = require('prop-types');
const assert = require('assert');
const debug = require('debug');

const { AddressbookContext } = require('../AddressbookProvider');
const AudioCallBox = require('./AudioCallBox');
const LocalMedia = require('./LocalMedia');
const VideoBox = require('./VideoBox');
const config = require('../config');
const { default: SwitchToVideoCallModel } = require('./SwitchToVideoCallModal');

const DEBUG = debug('blinkrtc:Call');


class Call extends React.Component {
    static contextType = AddressbookContext;

    constructor(props) {
        super(props);
        this.state = { audioOnly: this._deriveAudioOnly(this.props.currentCall), showDialog: false };

        // ES6 classes no longer autobind
        this.mediaPlaying = this.mediaPlaying.bind(this);
        this.callStateChanged = this.callStateChanged.bind(this);
        this.hangupCall = this.hangupCall.bind(this);
        this.onMediaUpdated = this.onMediaUpdated.bind(this);
        this.onUpdateRequest = this.onUpdateRequest.bind(this);
        this.onUpdateFailed = this.onUpdateFailed.bind(this);
        this.startVideoUpgrade = this.startVideoUpgrade.bind(this);
        this.onConfirm = this.onConfirm.bind(this);

        // If current call is available on mount we must have incoming
        if (this.props.currentCall != null && this.props.currentCall.state !== 'established') {
            this.props.currentCall.on('stateChanged', this.callStateChanged);
        }
        this._attachUpgradeHandlers(this.props.currentCall);
    }

    _deriveAudioOnly(call) {
        if (call != null) {
            const stream = call.getLocalStreams()[0];
            const hasVideo = stream && stream.getVideoTracks().length > 0;
            return !hasVideo;
        }
        return this.props.localMedia.getVideoTracks().length === 0;
    }

    _attachUpgradeHandlers(call) {
        if (call == null) {
            return;
        }
        call.removeListener('mediaUpdated', this.onMediaUpdated);
        call.removeListener('updateRequest', this.onUpdateRequest);
        call.removeListener('updateFailed', this.onUpdateFailed);
        call.on('mediaUpdated', this.onMediaUpdated);
        call.on('updateRequest', this.onUpdateRequest);
        call.on('updateFailed', this.onUpdateFailed);
    }

    _detachUpgradeHandlers(call) {
        if (call == null) {
            return;
        }
        call.removeListener('mediaUpdated', this.onMediaUpdated);
        call.removeListener('updateRequest', this.onUpdateRequest);
        call.removeListener('updateFailed', this.onUpdateFailed);
    }

    componentWillUnmount() {
        this._detachUpgradeHandlers(this.props.currentCall);
    }

    componentDidUpdate(prevProps, prevState) {
        // Needed for switching to incoming call while in a call
        if (prevProps.currentCall != null && prevProps.currentCall != this.props.currentCall) {
            if (this.props.currentCall != null) {
                this.props.currentCall.on('stateChanged', this.callStateChanged);
            } else {
                prevProps.currentCall.removeListener('stateChanged', this.callStateChanged);
            }
        }
        if (prevProps.currentCall !== this.props.currentCall) {
            this._detachUpgradeHandlers(prevProps.currentCall);
            this._attachUpgradeHandlers(this.props.currentCall);
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
                this.setState({ audioOnly: true });
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
                this.setState({ audioOnly: false });
            } else {
                this.forceUpdate();
            }
        }
    }

    startCall() {
        if (this.props.targetUri.endsWith(`@${config.defaultConferenceDomain}`)) {
            return;
        }
        assert(this.props.currentCall === null, 'currentCall is not null');
        let options = { pcConfig: { iceServers: config.iceServers } };
        options.localStream = this.props.localMedia;
        let call = this.props.account.call(this.props.targetUri, options);
        call.on('stateChanged', this.callStateChanged);
        this._attachUpgradeHandlers(call);
    }

    answerCall() {
        if (this.props.targetUri.endsWith(`@${config.defaultConferenceDomain}`)) {
            return;
        }
        assert(this.props.currentCall !== null, 'currentCall is null');
        let options = { pcConfig: { iceServers: config.iceServers } };
        options.localStream = this.props.localMedia;
        this.props.currentCall.answer(options);
        this._attachUpgradeHandlers(this.props.currentCall);
    }

    onUpdateRequest(payload) {
        const call = this.props.currentCall;
        if (call == null || typeof call.answerUpdate !== 'function') {
            return;
        }
        const remoteHasVideo = payload && payload.remoteMediaDirections &&
            (payload.remoteMediaDirections.video || []).some(d => d && d !== 'inactive');

        if (!remoteHasVideo) {
            try { call.answerUpdate({}); } catch (e) { DEBUG('answerUpdate failed: %o', e); }
            return;
        }
        // this.setState({showDialog: true});

        navigator.mediaDevices.getUserMedia({ audio: false, video: true })
            .then((stream) => {
                stream.getVideoTracks().forEach((t) => { t.enabled = false; });
                try {
                    call.answerUpdate({ localStream: stream });
                    this.setState({ showDialog: true, audioOnly: false });
                } catch (e) {
                    DEBUG('answerUpdate threw: %o', e);
                    stream.getTracks().forEach((t) => t.stop());
                    try { call.answerUpdate({}); } catch (e2) { /* ignore */ }
                }
            })
            .catch((error) => {
                DEBUG('getUserMedia for upgrade failed: %o', error);
                try { call.answerUpdate({}); } catch (e) { /* ignore */ }
                this.setState({ audioOnly: false });
            });
    }

    startVideoUpgrade() {
        const call = this.props.currentCall;
        if (call == null || typeof call.addVideo !== 'function') {
            return;
        }
        navigator.mediaDevices.getUserMedia({ audio: false, video: true })
            .then((stream) => {
                try {
                    call.addVideo({ localStream: stream });
                } catch (e) {
                    DEBUG('addVideo threw: %o', e);
                    stream.getTracks().forEach((t) => t.stop());
                }
            })
            .catch((error) => {
                DEBUG('getUserMedia for upgrade failed: %o', error);
            });
    }

    onMediaUpdated(payload) {
        DEBUG('mediaUpdated: %o', payload);
        if (payload && (payload.hasRemoteVideo || payload.hasLocalVideo)) {
            if (this.state.audioOnly) {
                this.setState({ audioOnly: false });
            } else {
                this.forceUpdate();
            }
        }
    }

    onUpdateFailed(error) {
        DEBUG('Video upgrade failed: %o', error);
    }

    onConfirm(stream) {
        this.setState({ showDialog: false });
        const call = this.props.currentCall;
        if (call == null || typeof call.answerUpdate !== 'function') {
            if (stream) {
                stream.getTracks().forEach((t) => t.stop());
            }
            return;
        }
        if (!stream) {
            return;
        }

        const existingVideoTrack = call.getLocalStreams()[0].getVideoTracks()[0];
        const isSameDevice = existingVideoTrack.label === stream.getVideoTracks()[0].label;

        if (isSameDevice) {
            existingVideoTrack.enabled = true;
            stream.getTracks().forEach((t) => t.stop());
            this.forceUpdate();
        } else {
             const newTrack = stream.getVideoTracks()[0].clone();
            call.replaceTrack(existingVideoTrack, newTrack, false, () => {
                this.forceUpdate();
            });
            stream.getTracks().forEach((t) => t.stop());
        }
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
        let contact;
        let inlineChat = this.props.inlineChat;
        if (this.props.currentCall !== null) {
            contact = this.context.lookup(this.props.currentCall.remoteIdentity);
            const domain = this.props.currentCall.remoteIdentity.uri.substring(this.props.currentCall.remoteIdentity.uri.indexOf('@') + 1);
            if (domain.startsWith('guest.')) {
                inlineChat = (function() { })();
            }
        } else {
            contact = this.context.lookup(this.props.targetUri);
        }

        if (this.props.localMedia !== null) {
            if (this.state.audioOnly) {
                box = (
                    <AudioCallBox
                        contact={contact}
                        hangupCall={this.hangupCall}
                        call={this.props.currentCall}
                        mediaPlaying={this.mediaPlaying}
                        startVideo={this.startVideoUpgrade}
                        escalateToConference={this.props.escalateToConference}
                        setDevice={this.props.setDevice}
                        toggleChatInCall={this.props.toggleChatInCall}
                        inlineChat={inlineChat}
                        unreadMessages={this.props.unreadMessages}
                        notificationCenter={this.props.notificationCenter}
                        propagateKeyPress={this.props.propagateKeyPress}
                        remoteAudio={this.props.remoteAudio}
                    />
                );
            } else {
                if (this.props.currentCall != null &&
                    (this.props.currentCall.state === 'accepted' || this.props.currentCall.state === 'established')
                ) {
                    box = (
                        <VideoBox
                            contact={contact}
                            call={this.props.currentCall}
                            localMedia={this.props.localMedia}
                            shareScreen={this.props.shareScreen}
                            hangupCall={this.hangupCall}
                            escalateToConference={this.props.escalateToConference}
                            generatedVideoTrack={this.props.generatedVideoTrack}
                            setDevice={this.props.setDevice}
                            toggleChatInCall={this.props.toggleChatInCall}
                            inlineChat={inlineChat}
                            unreadMessages={this.props.unreadMessages}
                            notificationCenter={this.props.notificationCenter}
                            propagateKeyPress={this.props.propagateKeyPress}
                            remoteAudio={this.props.remoteAudio}
                        />
                    );
                } else {
                    box = (
                        <LocalMedia
                            contact={contact}
                            localMedia={this.props.localMedia}
                            mediaPlaying={this.mediaPlaying}
                            hangupCall={this.hangupCall}
                            generatedVideoTrack={this.props.generatedVideoTrack}
                        />
                    );
                }
            }
        }
        return (
            <div>
                {box}
                {this.state.showDialog &&
                    <SwitchToVideoCallModel
                        show={this.state.showDialog}
                        close={() => { this.setState({showDialog: false})}}
                        contact={contact}
                        onConfirm={this.onConfirm}
                    />
                }
            </div>
        );
    }
}

Call.propTypes = {
    account: PropTypes.object.isRequired,
    hangupCall: PropTypes.func.isRequired,
    setDevice: PropTypes.func.isRequired,
    shareScreen: PropTypes.func.isRequired,
    currentCall: PropTypes.object,
    escalateToConference: PropTypes.func,
    localMedia: PropTypes.object,
    targetUri: PropTypes.string,
    generatedVideoTrack: PropTypes.bool,
    toggleChatInCall: PropTypes.func,
    inlineChat: PropTypes.object,
    notificationCenter: PropTypes.func,
    unreadMessages: PropTypes.object,
    propagateKeyPress: PropTypes.bool,
    remoteAudio: PropTypes.object
};


module.exports = Call;
