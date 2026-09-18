'use strict';

const React = require('react');
const PropTypes = require('prop-types');
const assert = require('assert');
const debug = require('debug');

const { AddressbookContext } = require('../../AddressbookProvider');

const CallOverlay = require('../CallOverlay');
const CallQuality = require('../CallQuality');
const { default: ZrtpCallBanners } = require('../ZrtpCallBanners');

const config = require('../../config');

const sylkrtc = require('sylkrtc');
const { default: clsx } = require('clsx');

const DEBUG = debug('blinkrtc:ChatCall');


const { withStyles } = require('@material-ui/core/styles');

const styleSheet = (theme) => ({
    remoteVideo: {
        width: '150px',
        height: '150px',
        objectFit: 'cover',
        position: 'absolute',
        right: '25px',
        top: '65px',
        zIndex: 8888,
        borderRadius: '50%',
        boxShadow: theme.shadows[4]
    },
    localVideo: {
        width: '50px',
        height: '50px',
        objectFit: 'cover',
        position: 'absolute',
        right: '15px',
        top: '75px',
        zIndex: 8889,
        borderRadius: '50%',
        boxShadow: theme.shadows[2]
    },
    hangupButton: {
        color: '#ac2925 !important',
        '&:hover': {
            color: '#d9534f !important'
        }
    },
    muted: {
        color: '#f0ad4e'
        //textShadow: '0 0 4px rgba(240,173,78,0.6)',
    }
});
class Call extends React.Component {
    static contextType = AddressbookContext;

    constructor(props) {
        super(props);

        const data = new Array(60).fill({});
        const audioOnly = this._deriveAudioOnly(this.props.currentCall);
        this.state = {
            audioOnly: audioOnly,
            audioGraphData: data,
            audioMuted: false,
            lastData: {},
            hasVideo: true
        };

        this.emaBitrate = 0;
        this.alpha = 0.4;
        this.videoWarmupTicks = 0;
        this.lowVideoStreak = 0;

        // ES6 classes no longer autobind
        this.mediaPlaying = this.mediaPlaying.bind(this);
        this.callStateChanged = this.callStateChanged.bind(this);
        this.hangupCall = this.hangupCall.bind(this);
        this.statistics = this.statistics.bind(this);
        this.muteAudio = this.muteAudio.bind(this);

        this.muteVideo = this.muteVideo.bind(this);
        this.isVideoMuted = this.isVideoMuted.bind(this);

        this.onUpdateRequest = this.onUpdateRequest.bind(this);
        this.onMediaUpdated = this.onMediaUpdated.bind(this);
        this.onUpdateFailed = this.onUpdateFailed.bind(this);
        this.onConfirm = this.onConfirm.bind(this);

        this.localVideo = React.createRef();
        this.remoteVideo = React.createRef();
        // If current call is available on mount we must have incoming
        if (this.props.currentCall != null && this.props.currentCall.state !== 'established') {
            this.props.currentCall.on('stateChanged', this.callStateChanged);
        }

        this._attachUpgradeHandlers(this.props.currentCall);

        if (this.props.currentCall == null || this.props.currentCall.state == 'incoming') {
            this.mediaPlaying()
        }
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

    localVideoRef = (node) => {
        this.localVideo.current = node;
        if (node && this.props.currentCall) {
            const stream = this.props.currentCall.getLocalStreams()[0];
            if (stream) {
                sylkrtc.utils.attachMediaStream(stream, node, { disableContextMenu: true, muted: true });
            }
        }
    };

    remoteVideoRef = (node) => {
        this.remoteVideo.current = node;
        if (node && this.props.currentCall) {
            const stream = this.props.currentCall.getRemoteStreams()[0];
            if (stream) {
                sylkrtc.utils.attachMediaStream(stream, node, { disableContextMenu: true, muted: true });
            }
        }
    };

    componentDidMount() {
        if (this.props.currentCall != null) {
            this.props.currentCall.statistics.on('stats', this.statistics);
            const localStream = this.props.currentCall?.getLocalStreams?.()[0];
            const audioTrack = localStream?.getAudioTracks?.()[0];

            if (audioTrack) {
                this.setState({ audioMuted: !audioTrack.enabled });
            }
        }
    }

    componentDidUpdate(prevProps, prevState) {
        // Needed for switching to incoming call while in a call
        if (prevProps.currentCall != null && prevProps.currentCall != this.props.currentCall) {
            if (this.props.currentCall != null) {
                prevProps.currentCall.statistics.removeListener('stats', this.statistics);
                this.props.currentCall.on('stateChanged', this.callStateChanged);
                this.props.currentCall.statistics.on('stats', this.statistics);
            } else {
                prevProps.currentCall.statistics.removeListener('stats', this.statistics);
                prevProps.currentCall.removeListener('stateChanged', this.callStateChanged);
            }
        }
        if (prevProps.currentCall !== this.props.currentCall) {
            this._detachUpgradeHandlers(prevProps.currentCall);
            this._attachUpgradeHandlers(this.props.currentCall);
        }
    }

    componentWillUnmount() {
        if (this.props.currentCall) {
            this.props.currentCall.statistics.removeListener('stats', this.statistics);
        }
        this._detachUpgradeHandlers(this.props.currentCall);
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

        navigator.mediaDevices.getUserMedia({ audio: false, video: true })
            .then((stream) => {
                stream.getVideoTracks().forEach((t) => { t.enabled = false; });
                try {
                    call.answerUpdate({ localStream: stream });
                    this.setState({ audioOnly: false });
                } catch (e) {
                    DEBUG('answerUpdate threw: %o', e);
                    stream.getTracks().forEach((t) => t.stop());
                    try { call.answerUpdate({}); } catch (e2) { /* ignore */ }
                }
            })
            .catch((error) => {
                DEBUG('getUserMedia for upgrade failed: %o', error);
                try { call.answerUpdate({}); } catch (e) { /* ignore */ }
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
        } else {
            const newTrack = stream.getVideoTracks()[0].clone();
            call.replaceTrack(existingVideoTrack, newTrack, false, () => {
                this.forceUpdate();
            });
            stream.getTracks().forEach((t) => t.stop());
        }
    }

    statistics(stats) {
        const audioData = stats.data.audio;
        const audioRemoteData = stats.data.remote.audio;
        const audioRemoteExists = audioRemoteData.inbound[0];

        if (!audioRemoteExists) {
            return;
        }

        const audioJitter = audioData.inbound[0].jitter || 0;
        const audioRTT = audioRemoteData.inbound[0].roundTripTime || 0;

        const audioPacketsLostOutbound = audioRemoteExists && audioRemoteData.inbound[0].packetLossRate || 0;
        const audioPacketsLostInbound = audioData.inbound[0].packetLossRate || 0;
        const audioPacketRateOutbound = (audioData && audioData.outbound[0].packetRate) || 0;
        const audioPacketRateInbound = (audioData && audioData.inbound[0].packetRate) || 0;

        const addData = {
            timestamp: audioData.timestamp,
            incomingBitrate: audioData.inbound[0].bitrate || 0,
            outgoingBitrate: audioData.outbound[0].bitrate || 0,
            latency: audioRTT,
            jitter: audioJitter,
            packetsLostOutbound: audioPacketsLostOutbound,
            packetsLostInbound: audioPacketsLostInbound,
            packetRateOutbound: audioPacketRateOutbound,
            packetRateInbound: audioPacketRateInbound
        };

        const videoInbound = stats.data.video?.inbound[0];
        const bitrate = videoInbound?.bitrate || 0;
        const packets = videoInbound?.packetRate || 0;
        const videoRemoteExists = stats.data.remote.video?.inbound[0];

        if (bitrate > 0 && this.emaBitrate === 0) {
            this.emaBitrate = bitrate;
            this.videoWarmupTicks = 5;
        } else {
            this.emaBitrate = this.alpha * bitrate + (1 - this.alpha) * this.emaBitrate;
        }

        const meetsThreshold = videoRemoteExists === undefined
            ? undefined
            : (videoRemoteExists && this.emaBitrate > 5000 && packets > 15);

        let hasVideo = this.state.hasVideo;
        if (meetsThreshold === true) {
            this.lowVideoStreak = 0;
            this.videoWarmupTicks = 0;
            hasVideo = true;
        } else if (meetsThreshold === false) {
            if (this.videoWarmupTicks > 0) {
                this.videoWarmupTicks -= 1;
            } else {
                this.lowVideoStreak = (this.lowVideoStreak || 0) + 1;
                if (this.lowVideoStreak >= 3) {
                    hasVideo = false;
                }
            }
        }

        if (hasVideo !== this.state.hasVideo && !hasVideo) {
            clearTimeout(this.overlayTimer);
            this.setState({ callOverlayVisible: true });
        }
        this.setState(state => {
            const audioGraphData = state.audioGraphData.concat(addData);
            audioGraphData.shift();
            return {
                audioGraphData,
                lastData: stats.data,
                hasVideo
            };
        });
    }

    callStateChanged(oldState, newState, data) {
        if (newState === 'established') {
            const currentCall = this.props.currentCall;
            currentCall.removeListener('stateChanged', this.callStateChanged);
            const remoteStream = currentCall.getRemoteStreams()[0];
            sylkrtc.utils.attachMediaStream(remoteStream, this.props.remoteAudio.current);
        } else if (newState === 'accepted') {
            this.forceUpdate();
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
        call.statistics.on('stats', this.statistics);
    }

    answerCall() {
        if (this.props.targetUri.endsWith(`@${config.defaultConferenceDomain}`)) {
            return;
        }
        assert(this.props.currentCall !== null, 'currentCall is null');
        let options = { pcConfig: { iceServers: config.iceServers } };
        options.localStream = this.props.localMedia;
        this.props.currentCall.answer(options);
    }

    hangupCall() {
        this.props.hangupCall();
    }

    muteAudio() {
        const localStream = this.props.currentCall.getLocalStreams()[0];

        if (this.state.audioMuted) {
            DEBUG('Unmute microphone');
            localStream.getAudioTracks()[0].enabled = true;
            this.setState({ audioMuted: false });
        } else {
            DEBUG('Mute microphone');
            localStream.getAudioTracks()[0].enabled = false;
            this.setState({ audioMuted: true });
        }
    }

    isVideoMuted() {
        const stream = this.props.currentCall && this.props.currentCall.getLocalStreams()[0];
        const track = stream && stream.getVideoTracks()[0];
        return track ? !track.enabled : true;
    }

    muteVideo() {
        const stream = this.props.currentCall.getLocalStreams()[0];
        const track = stream && stream.getVideoTracks()[0];
        if (!track) {
            return;
        }
        track.enabled = !track.enabled;
        this.forceUpdate(); // track mutated directly, not via state
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
        let isConference = false;

        const callQuality = (<CallQuality audioData={this.state.audioGraphData} />);
        if (this.props.currentCall !== null) {
            contact = this.context.lookup(this.props.currentCall.remoteIdentity);
            const domain = this.props.currentCall.remoteIdentity.uri.substring(this.props.currentCall.remoteIdentity.uri.indexOf('@') + 1);
            if (domain.startsWith('guest.')) {
                inlineChat = (function() { })();
            }
        } else {
            contact = this.context.lookup(this.props.targetUri);
        }

        let buttons = [];

        const muteButtonIconClasses = clsx({
            'fa': true,
            'fa-2x': true,
            'fa-microphone': !this.state.audioMuted,
            'fa-microphone-slash': this.state.audioMuted,
            [this.props.classes.muted]: this.state.audioMuted

        });


        if (this.props.currentCall !== null) {
            const muteVideoIconClasses = clsx({
                'fa': true,
                'fa-2x': true,
                'fa-video-camera': !this.isVideoMuted(),
                'fa-video-camera-slash': this.isVideoMuted(),
                [this.props.classes.muted]: this.isVideoMuted()
            });

            buttons = [
                <button
                    key="muteButton"
                    className="btn btn-link btn-fw"
                    type="button" onClick={() => {
                        this.muteAudio();
                    }}
                    title="Mute"
                >
                    <i className={muteButtonIconClasses}></i>
                </button>,
                !this.state.audioOnly &&
                    <button
                        key="muteVideoButton"
                        className="btn btn-link btn-fw"
                        type="button"
                        onClick={() => { this.muteVideo(); }}
                        title={this.isVideoMuted() ? 'Turn camera on' : 'Turn camera off'}
                    >
                        <i className={muteVideoIconClasses}></i>
                    </button>,
                <button
                    key="hangupButton"
                    className={'btn btn-link btn-fw ' + this.props.classes.hangupButton}
                    type="button"
                    onClick={() => {
                        this.hangupCall();
                    }}
                    title="Hangup Call"
                >
                    <i className="fa fa-phone rotate-135 fa-2x"></i>
                </button>
            ];

            if (this.props.currentCall.remoteIdentity.uri.endsWith(`@${config.defaultConferenceDomain}`)) {
                isConference = true;
                buttons.unshift(
                    <button
                        key="callButton"
                        className="btn btn-link btn-fw"
                        style={{
                            color: '#5cb85c',
                            textShadow: '0 0 6px rgba(92,184,92,0.6)'
                        }}
                        type="button"
                        onClick={() => {
                            this.props.router.navigate('/conference');
                        }}
                        title="Back to Conference"
                    >
                        <i className="fa fa-2x fa-phone" />
                    </button>
                );
            } else {
                buttons.unshift(
                    <button
                        key="callButton"
                        className="btn btn-link btn-fw"
                        type="button"
                        style={{
                            color: '#5cb85c',
                            textShadow: '0 0 6px rgba(92,184,92,0.6)'
                        }}
                        onClick={() => {
                            this.props.router.navigate('/call');
                        }}
                        title="Back to Call"
                    >
                        <i className="fa fa-2x fa-phone" />
                    </button>
                );
            }
        }
        box = [
            <ZrtpCallBanners call={this.props.currentCall} notificationCenter={this.props.notificationCenter} />,
            <CallOverlay
                show={true}
                contact={contact}
                call={this.props.currentCall}
                onTop={true}
                disableHide={true}
                callQuality={callQuality}
                buttons={buttons}
                alternativeLayout={true}
                key="overlay"
            />
        ];

        if (this.props.currentCall != null && !this.state.audioOnly && !isConference &&
            (this.props.currentCall.state === 'accepted' || this.props.currentCall.state === 'established')
        ) {
            if (this.state.hasVideo) {
                box.push(<video key="remotevideo" id="remoteVideo" className={this.props.classes.remoteVideo} poster="assets/images/transparent-1px.png" ref={this.remoteVideoRef} autoPlay />);
            }
            if (!this.state.audioOnly && !this.isVideoMuted()) {
                box.push(<video key="localvideo" id="localVideo" className={this.props.classes.localVideo} ref={this.localVideoRef} autoPlay />);
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
    classes: PropTypes.object.isRequired,
    router: PropTypes.object.isRequired,
    account: PropTypes.object.isRequired,
    hangupCall: PropTypes.func.isRequired,
    currentCall: PropTypes.object,
    localMedia: PropTypes.object,
    targetUri: PropTypes.string,
    remoteAudio: PropTypes.object,
    notificationCenter: PropTypes.func
};


module.exports = withStyles(styleSheet)(Call);
