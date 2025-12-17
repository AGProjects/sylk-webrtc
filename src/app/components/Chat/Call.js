'use strict';

const React = require('react');
const PropTypes = require('prop-types');
const assert = require('assert');
const debug = require('debug');

const CallOverlay = require('../CallOverlay');
const CallQuality = require('../CallQuality');
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
        bottom: '65px',
        zIndex: 8888,
        boxShadow: '5px 10px',
        borderRadius: '50%',
        boxShadow: theme.shadows[4]
    },
    localVideo: {
        width: '50px',
        height: '50px',
        objectFit: 'cover',
        position: 'absolute',
        right: '25px',
        bottom: '165px',
        zIndex: 8888,
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
    constructor(props) {
        super(props);

        const data = new Array(60).fill({});
        let audioOnly;
        if (this.props.localMedia.getVideoTracks().length === 0) {
            DEBUG('Will send audio only');
            audioOnly = true;
        } else {
            audioOnly = false;
        }
        this.state = {
            audioOnly: audioOnly,
            audioGraphData: data,
            audioMuted: false,
            lastData: {}
        };

        // ES6 classes no longer autobind
        this.mediaPlaying = this.mediaPlaying.bind(this);
        this.callStateChanged = this.callStateChanged.bind(this);
        this.hangupCall = this.hangupCall.bind(this);
        this.statistics = this.statistics.bind(this);
        this.muteAudio = this.muteAudio.bind(this);

        this.localVideo = React.createRef();
        this.remoteVideo = React.createRef();
        // If current call is available on mount we must have incoming
        if (this.props.currentCall != null && this.props.currentCall.state !== 'established') {
            this.props.currentCall.on('stateChanged', this.callStateChanged);
        }

        if (this.props.currentCall == null || this.props.currentCall.state == 'incoming') {
            this.mediaPlaying()
        }
    }

    componentDidMount() {
        if (!this.state.audioOnly) {
            sylkrtc.utils.attachMediaStream(this.props.currentCall.getLocalStreams()[0], this.localVideo.current, { disableContextMenu: true, muted: true });
            const remoteStream = this.props.currentCall.getRemoteStreams()[0];
            if (remoteStream) {
                sylkrtc.utils.attachMediaStream(remoteStream, this.remoteVideo.current, { disableContextMenu: true, muted: true });
            }
        }
        if (this.props.currentCall != null) {
            this.props.currentCall.statistics.on('stats', this.statistics);
            const localStream = this.props.currentCall.getLocalStreams()[0];
            this.setState({ audioMuted: !localStream.getAudioTracks()[0].enabled});
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
    }

    componentWillUnmount() {
        this.props.currentCall.statistics.removeListener('stats', this.statistics);
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
            latency: audioRTT / 2,
            jitter: audioJitter,
            packetsLostOutbound: audioPacketsLostOutbound,
            packetsLostInbound: audioPacketsLostInbound,
            packetRateOutbound: audioPacketRateOutbound,
            packetRateInbound: audioPacketRateInbound
        };
        this.setState(state => {
            const audioGraphData = state.audioGraphData.concat(addData);
            audioGraphData.shift();
            return {
                audioGraphData,
                lastData: stats.data
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
        assert(this.props.currentCall === null, 'currentCall is not null');
        let options = { pcConfig: { iceServers: config.iceServers } };
        options.localStream = this.props.localMedia;
        let call = this.props.account.call(this.props.targetUri, options);
        call.on('stateChanged', this.callStateChanged);
        call.statistics.on('stats', this.statistics);
    }

    answerCall() {
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
        let isConference = false;

        const callQuality = (<CallQuality audioData={this.state.audioGraphData} />);
        if (this.props.currentCall !== null) {
            remoteIdentity = this.props.currentCall.remoteIdentity.displayName || this.props.currentCall.remoteIdentity.uri;
            const domain = this.props.currentCall.remoteIdentity.uri.substring(this.props.currentCall.remoteIdentity.uri.indexOf('@') + 1);
            if (domain.startsWith('guest.')) {
                inlineChat = (function() { })();
            }
        } else {
            remoteIdentity = this.props.targetUri;
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
            <CallOverlay
                show={true}
                remoteIdentity={remoteIdentity}
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
            box.push(<video key="remotevideo" id="remoteVideo" className={this.props.classes.remoteVideo} poster="assets/images/transparent-1px.png" ref={this.remoteVideo} autoPlay />);
            box.push(<video key="localvideo" id="localVideo" className={this.props.classes.localVideo} ref={this.localVideo} autoPlay />);
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
    remoteAudio: PropTypes.object
};


module.exports = withStyles(styleSheet)(Call);
