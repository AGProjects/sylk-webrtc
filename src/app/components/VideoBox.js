'use strict';

const React = require('react');
const PropTypes = require('prop-types');
const { default: TransitionGroup } = require('react-transition-group/TransitionGroup');
const { default: CSSTransition } = require('react-transition-group/CSSTransition');
const ReactMixin = require('react-mixin');
const sylkrtc = require('sylkrtc');
const { Badge, IconButton, Menu, MenuItem, ListItemIcon } = require('@material-ui/core');
const { withStyles } = require('@material-ui/core/styles');
const {
    NetworkCheck: NetworkCheckIcon
} = require('@material-ui/icons');
const { default: clsx } = require('clsx');
const debug = require('debug');

const FullscreenMixin = require('../mixins/FullScreen');
const CallOverlay = require('./CallOverlay');
const CallQuality = require('./CallQuality');
const ConferenceDrawer = require('./ConferenceDrawer');
const DragAndDrop = require('./DragAndDrop');
const SwitchDevicesMenu = require('./SwitchDevicesMenu');
const EscalateConferenceModal = require('./EscalateConferenceModal');
const Statistics = require('./Statistics');
const UserIcon = require('./UserIcon');

const hark = require('hark');
const { default: FileUploadModal } = require('./FileUploadModal');

const fileTransferUtils = require('../fileTransferUtils');
const utils = require('../utils');
const RemotePointerSession = require('../RemotePointerSession');
const { CAP_SCREEN_SHARING, CAP_SCREEN_REQUEST } = require('../CallCapabilities');

const DEBUG = debug('blinkrtc:Video');

const styleSheet = {
    badge: {
        width: '20px',
        height: '20px',
        fontWeight: 'bold',
        fontSize: '1rem',
        backgroundColor: '#337ab7',
        '&.MuiBadge-anchorOriginTopLeftCircular': {
            top: '18%',
            left: '18%'
        },
        '&.MuiBadge-anchorOriginTopRightCircular': {
            top: '18%',
            right: '18%'
        }
    },
    sharingButton: {
        width: '45px',
        height: '45px',
        backgroundColor: '#fff',
        fontSize: '20px',
        border: '1px solid #fff',
        color: '#333',
        margin: '4px',
        '&:hover': {
            backgroundColor: '#fff'
        }
    }
};

class VideoBox extends React.Component {
    constructor(props) {
        super(props);
        const data = new Array(60).fill({});

        this.state = {
            callOverlayVisible: true,
            audioMuted: false,
            videoMuted: (() => {
                try {
                    const s = this.props.call.getLocalStreams()[0];
                    const vt = s && s.getVideoTracks()[0];
                    return vt ? !vt.enabled : false;
                } catch (e) {
                    return false;
                }
            })(),
            localVideoShow: false,
            remoteVideoShow: false,
            remoteSharesScreen: false,
            // Remote-pointer feature (screen-share guidance). The protocol and
            // the peer's state live on the call (sylkrtc); these mirror it for
            // rendering. `pointerMode` is ours alone: while on, clicking the
            // remote screen sends a guide point.
            pointerMode: false,
            remotePeerSharing: false,
            showEscalateConferenceModal: false,
            switchAnchor: null,
            showSwitchMenu: false,
            showAudioSwitchMenu: false,
            showStatistics: false,
            showInlineChat: false,
            videoGraphData: data,
            audioGraphData: data,
            callQuality: new Array(30).fill({}),
            upload: null,
            lastData: {},
            hasVideo: true,
            // Local echo of a click WE sent that the peer ACKed rendering.
            ackEcho: null,
            // The peer can render a marker right now (their app/tab is in front).
            remoteInApp: true,
            // The peer's share can be pointed at at all — false for a shared
            // application window or tab, where nothing on their side can place a
            // marker. Gates the pointer button so it never silently no-ops.
            remotePointerCapable: true,
            // A "share your screen" request of ours is on the wire and has not
            // been answered yet.
            screenRequestPending: false,
            anchorEl: null
        };
        this.emaBitrate = 0;
        this.alpha = 0.4;
        this.videoWarmupTicks = 0;
        this.lowVideoStreak = 0;

        this.overlayTimer = null;
        this.ackEchoTimer = null;
        // Id of the screen-share request we are waiting on. The deadline that
        // gives up on it is the call's, not ours.
        this.screenRequestId = null;
        this.localVideo = React.createRef();
        this.remoteVideo = React.createRef();
        this._notificationCenter = null;
        this.speechEvents = null;
        // Pointer geometry and marker drawing, created on mount (see
        // componentDidMount). The protocol behind it lives in the call.
        this.pointerSession = null;

        // ES6 classes no longer autobind
        [
            'showCallOverlay',
            'onKeyDown',
            'handleFullscreen',
            'handleLocalVideoPlaying',
            'handleRemoteVideoPlaying',
            'handleRemoteResize',
            'muteAudio',
            'muteVideo',
            'hangupCall',
            'toggleEscalateConferenceModal',
            'toggleSwitchMenu',
            'toggleAudioSwitchMenu',
            'toggleStatistics',
            'toggleChatInCall',
            'toggleInlineChat',
            'escalateToConference',
            'incomingMessage',
            'statistics',
            'handleFiles',
            'handleDrop',
            'uploadFiles',
            'sendPointer',
            'togglePointerMode',
            'handleRemoteScreenSharingChanged',
            'handlePointerAck',
            'requestScreenShare',
            'handlePeerCapabilities',
            'handleScreenRequestResolved'
        ].forEach((name) => {
            this[name] = this[name].bind(this);
        });
    }

    componentDidUpdate() {
        const s = this.props.call.getLocalStreams()[0];
        const vt = s && s.getVideoTracks()[0];
        if (vt && vt.enabled && this.state.videoMuted) {
            this.setState({ videoMuted: false, localVideoShow: true });
        }
        // Screen-share start/stop used to be announced from here, by noticing
        // that call.sharingScreen had changed since the last render. sylkrtc
        // announces it itself now, from the one place that knows the share
        // really started.
    }

    componentDidMount() {
        sylkrtc.utils.attachMediaStream(this.props.call.getLocalStreams()[0], this.localVideo.current, { disableContextMenu: true, muted: true });
        let promise = this.localVideo.current.play()
        if (promise !== undefined) {
            promise.then(_ => {
                this.handleLocalVideoPlaying();
                const localStream = this.props.call.getLocalStreams()[0];
                this.setState({ audioMuted: !localStream.getAudioTracks()[0].enabled });
                // Autoplay started!
            }).catch(error => {
                // Autoplay was prevented.
                // Show a "Play" button so that user can start playback.
            });
        } else {
            this.localVideo.current.addEventListener('playing', this.handleLocalVideoPlaying);
        }

        if (this.props.notificationCenter) {
            this._notificationCenter = this.props.notificationCenter();
        }

        this.remoteVideo.current.addEventListener('playing', this.handleRemoteVideoPlaying);
        this.props.call.account.on('incomingMessage', this.incomingMessage);

        // Drawing the peer's guide points, and mapping our clicks onto their
        // shared screen. The protocol behind it lives in the call.
        this.pointerSession = new RemotePointerSession(this.props.call);
        this.pointerSession.on('ack', this.handlePointerAck);

        // Everything the peer told us -- what their build can do, whether they
        // are sharing, whether that share can be pointed at -- is decoded by
        // sylkrtc and kept on the call, which outlives this component. So seed
        // from what is already there (we may be remounting mid-share), then
        // follow the events.
        this.props.call.on('capabilitiesChanged', this.handlePeerCapabilities);
        this.props.call.on('remoteScreenSharingChanged', this.handleRemoteScreenSharingChanged);
        this.props.call.on('screenShareRequestResolved', this.handleScreenRequestResolved);
        if (this.props.call.remoteScreenSharing) {
            this.handleRemoteScreenSharingChanged({
                sharing: true,
                pointable: this.props.call.remoteScreenSharePointable,
                inApp: this.props.call.remoteInApp
            });
        }

        sylkrtc.utils.attachMediaStream(this.props.call.getRemoteStreams()[0], this.remoteVideo.current, { muted: true, disableContextMenu: true });
        const options = {
            interval: 225,
            play: false
        };
        this.speechEvents = hark(this.props.call.getRemoteStreams()[0], options);
        this.speechEvents.on('speaking', () => {
            this.setState({ active: true });
        });
        this.speechEvents.on('stopped_speaking', () => {
            this.setState({ active: false });
        });
        const stream = this.props.remoteAudio.current.srcObject;
        if (!stream || stream.id !== this.props.call.getRemoteStreams()[0].id) {
            DEBUG('Attaching audio');
            sylkrtc.utils.attachMediaStream(this.props.call.getRemoteStreams()[0], this.props.remoteAudio.current, { disableContextMenu: true });
        }
        this.props.call.statistics.on('stats', this.statistics);
        document.addEventListener('keydown', this.onKeyDown);
    }

    componentWillUnmount() {
        if (this.remoteVideo.current) {
            this.remoteVideo.current.onresize = null;
        }
        if (this.speechEvents !== null) {
            this.speechEvents.stop();
            this.speechEvents = null;
        }
        clearTimeout(this.overlayTimer);
        this.remoteVideo.current.removeEventListener('playing', this.handleRemoteVideoPlaying);
        this.localVideo.current.removeEventListener('playing', this.handleLocalVideoPlaying);
        this.exitFullscreen();
        document.removeEventListener('keydown', this.onKeyDown);
        this.props.call.account.removeListener('incomingMessage', this.incomingMessage);
        clearTimeout(this.ackEchoTimer);
        if (this.pointerSession) {
            this.pointerSession.close();
            this.pointerSession = null;
        }
        this.props.call.removeListener('capabilitiesChanged', this.handlePeerCapabilities);
        this.props.call.removeListener('remoteScreenSharingChanged', this.handleRemoteScreenSharingChanged);
        this.props.call.removeListener('screenShareRequestResolved', this.handleScreenRequestResolved);
        this.props.call.statistics.removeListener('stats', this.statistics);
    }

    onKeyDown(event) {
        if (!this.state.showEscalateConferenceModal && !this.props.propagateKeyPress) {
            switch (event.which) {
                case 77:    // m/M
                    this.muteAudio(event)
                    break;
                case 86:    // v/V
                    this.muteVideo(event)
                    break;
                case 83:    // s/S
                    event.preventDefault();
                    this.props.shareScreen();
                    setTimeout(() => { this.forceUpdate() }, 100);
                    break;
                case 70:    // f/F
                    event.preventDefault();
                    this.toggleFullscreen();
                    break;
                default:
                    break;
            }
        }
    }

    statistics(stats) {
        const videoData = stats.data.video;
        const audioData = stats.data.audio;

        const audioRemoteData = stats.data.remote.audio;
        const videoRemoteData = stats.data.remote.video;

        const videoRemoteExists = videoRemoteData.inbound[0];
        const audioRemoteExists = audioRemoteData.inbound[0];

        if (!videoRemoteExists && !audioRemoteExists) {
            return;
        }

        let videoRTT = (videoRemoteExists && videoRemoteData.inbound[0].roundTripTime) || 0
        const videoJitter = (videoData && videoData.inbound[0].jitter) || 0
        const videoPacketRateOutbound = (videoData && videoData.outbound[0].packetRate) || 0;
        const videoPacketRateInbound = (videoData && videoData.inbound[0].packetRate) || 0;
        const videoPacketsLostOutbound = videoRemoteExists && videoRemoteData.inbound[0].packetLossRate || 0;
        const videoPacketsLostInbound = videoData.inbound[0].packetLossRate || 0;

        const audioJitter = audioData.inbound[0].jitter || 0;
        const audioRTT = audioRemoteExists && audioRemoteData.inbound[0].roundTripTime || 0;
        const audioPacketsLostOutbound = audioRemoteExists && audioRemoteData.inbound[0].packetLossRate || 0;
        const audioPacketsLostInbound = audioData.inbound[0].packetLossRate || 0;
        const audioPacketRateOutbound = (audioData && audioData.outbound[0].packetRate) || 0;
        const audioPacketRateInbound = (audioData && audioData.inbound[0].packetRate) || 0;

        if (videoRTT === 0 && audioRTT !== 0) {
            videoRTT = audioRTT;
        }

        const addData = {
            audio: {
                timestamp: audioData.timestamp,
                incomingBitrate: audioData.inbound[0].bitrate || 0,
                outgoingBitrate: audioData.outbound[0].bitrate || 0,
                latency: audioRTT,
                jitter: audioJitter,
                packetsLostOutbound: audioPacketsLostOutbound,
                packetsLostInbound: audioPacketsLostInbound,
                packetRateOutbound: audioPacketRateOutbound,
                packetRateInbound: audioPacketRateInbound
            },
            video: {
                timestamp: videoData.timestamp,
                incomingBitrate: videoData.inbound[0].bitrate || 0,
                outgoingBitrate: videoData.outbound[0].bitrate || 0,
                latency: videoRTT,
                jitter: videoJitter,
                packetsLostOutbound: videoPacketsLostOutbound,
                packetsLostInbound: videoPacketsLostInbound,
                packetRateOutbound: videoPacketRateOutbound,
                packetRateInbound: videoPacketRateInbound
            }
        };

        const bitrate = addData?.video?.incomingBitrate;
        const packets = addData?.video?.packetRateInbound;

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
                // While the peer is SCREEN SHARING, a static screen sends a low,
                // bursty bitrate that trips this threshold even though the share
                // is fine. Don't hide the video / show the poster there — the
                // detection is only meant to catch a dead camera stream.
                if (this.lowVideoStreak >= 3 && !this.state.remotePeerSharing) {
                    hasVideo = false;
                }
            }
        }

        if (hasVideo !== this.state.hasVideo && !hasVideo) {
            clearTimeout(this.overlayTimer);
            this.setState({ callOverlayVisible: true });
        }
        // DEBUG(this.emaBitrate, hasVideo, packets)
        this.setState(state => {
            const videoGraphData = state.videoGraphData.concat(addData.video);
            const audioGraphData = state.audioGraphData.concat(addData.audio);
            videoGraphData.shift();
            audioGraphData.shift();
            return {
                videoGraphData,
                audioGraphData,
                lastData: stats.data,
                hasVideo
            };
        });
    }

    handleFullscreen(event) {
        event.preventDefault();
        this.toggleFullscreen(document.body);
    }

    handleLocalVideoPlaying() {
        const localStream = this.props.call.getLocalStreams()[0];
        const videoTrack = localStream && localStream.getVideoTracks()[0];
        this.setState({
            localVideoShow: videoTrack ? videoTrack.enabled : true
        });
    }

    handleRemoteVideoPlaying() {
        this.setState({ remoteVideoShow: true });
        this.remoteVideo.current.onresize = (event) => {
            this.handleRemoteResize(event)
        };
        this.armOverlayTimer();
    }

    handleRemoteResize(event, target) {
        //DEBUG("%o", event);
        const resolutions = ['1280x720', '960x540', '640x480', '640x360', '480x270', '320x180'];
        const vw = event.target.videoWidth, vh = event.target.videoHeight;
        this.pointerSession?.noteRemoteVideoSize(vw, vh);
        const videoResolution = vw + 'x' + vh;
        if (resolutions.indexOf(videoResolution) === -1) {
            this.setState({ remoteSharesScreen: true });
        } else {
            this.setState({ remoteSharesScreen: false });
        }
    }

    // The peer started/stopped sharing, or their share's pointability or
    // renderability changed (sylkrtc's 'remoteScreenSharingChanged').
    handleRemoteScreenSharingChanged(remote) {
        const startedSharing = remote.sharing && !this.state.remotePeerSharing;
        this.setState({
            remotePeerSharing: remote.sharing,
            remotePointerCapable: remote.pointable,
            remoteInApp: remote.inApp,
            // Losing the share or its pointability turns the pointer off; the
            // peer merely stepping out of their app does not — pointing resumes
            // by itself when they come back (the cursor says so meanwhile).
            pointerMode: remote.sharing && remote.pointable && this.state.pointerMode,
            // A share starting must not be hidden by a stale low-bitrate verdict
            // from before it (see statistics()).
            hasVideo: remote.sharing || this.state.hasVideo,
            callOverlayVisible: remote.sharing || this.state.callOverlayVisible
        });
        if (startedSharing) {
            this.lowVideoStreak = 0;
            clearTimeout(this.overlayTimer);
            // The screen we asked for is here. Clear any request still pending
            // even if its request_accept never arrived -- the share itself is
            // the answer, and leaving a request open would let its timeout
            // announce that the peer "did not respond" while we watch their
            // screen.
            if (this.state.screenRequestPending) {
                this.clearScreenRequest();
            }
        }
    }

    // The peer confirmed rendering a point we sent: echo it where we clicked.
    handlePointerAck(origin) {
        this.setState({ ackEcho: { left: origin.clientX, top: origin.clientY } });
        clearTimeout(this.ackEchoTimer);
        this.ackEchoTimer = setTimeout(() => this.setState({ ackEcho: null }), 900);
    }

    togglePointerMode() {
        this.setState({ pointerMode: !this.state.pointerMode });
    }

    // ===== Screen-share REQUEST (ask the peer to share THEIR screen) =====
    //
    // The mirror image of the share button, which shares ours. sylkrtc owns
    // the handshake and its 60 s deadline, answering with
    // 'screenShareRequestResolved' -- accepted, declined, or timed out. An
    // accepted share follows separately, once the peer is through their
    // source picker. All this owns is the button.

    handlePeerCapabilities() {
        this.forceUpdate();
    }

    /** Can we offer to ask this peer for their screen? Only when they
     *  advertised BOTH that they can produce a screen and that they run the
     *  request handshake. Absence of an advertisement means an older build or
     *  a PSTN gateway, and offering the button there would send a request
     *  nothing will ever answer. */
    peerCanShareScreen() {
        return this.props.call.peerSupports(CAP_SCREEN_SHARING)
        && this.props.call.peerSupports(CAP_SCREEN_REQUEST);
    }

    /** Human label for the peer, for the outcome notification. */
    peerLabel() {
        const identity = this.props.contact && this.props.contact.identity;
        if (identity && identity.displayName) {
            return identity.displayName;
        }
        const uri = this.props.call.remoteIdentity && this.props.call.remoteIdentity.uri;
        return (uri && uri.split('@')[0]) || 'Your contact';
    }

    requestScreenShare() {
        if (this.state.screenRequestPending) {
            return;
        }
        const requestId = this.props.call.requestScreenShare();
        if (!requestId) {
            return;
        }
        this.screenRequestId = requestId;
        this.setState({ screenRequestPending: true, anchorEl: null });
    }

    // The peer answered, or nobody did: sylkrtc reports a peer that never
    // answers (older build, prompt nobody saw, window closed) as a timeout at
    // the deadline it put on the wire, so the button cannot stick on
    // "Waiting...".
    handleScreenRequestResolved(result) {
        if (!result || result.id !== this.screenRequestId) {
            return;
        }
        this.clearScreenRequest();
        if (result.reason === 'timeout') {
            this.postScreenRequestOutcome(
                `${this.peerLabel()} did not respond to the screen request`);
            return;
        }
        this.postScreenRequestOutcome(result.accepted
            ? `${this.peerLabel()} accepted — waiting for the screen…`
            : `${this.peerLabel()} declined to share the screen`);
    }

    clearScreenRequest() {
        this.screenRequestId = null;
        this.setState({ screenRequestPending: false });
    }

    postScreenRequestOutcome(text) {
        if (this._notificationCenter) {
            this._notificationCenter.postScreenShareRequestOutcome(text);
        }
    }

    sendPointer(event) {
        if (!this.state.pointerMode) { return; }
        this.pointerSession?.sendPoint(this.remoteVideo.current, event);
    }

    muteAudio(event) {
        event.preventDefault();
        const localStream = this.props.call.getLocalStreams()[0];
        if (localStream.getAudioTracks().length > 0) {
            const track = localStream.getAudioTracks()[0];
            if (this.state.audioMuted) {
                DEBUG('Unmute microphone');
                track.enabled = true;
                this.setState({ audioMuted: false });
            } else {
                DEBUG('Mute microphone');
                track.enabled = false;
                this.setState({ audioMuted: true });
            }
        }
    }

    muteVideo(event) {
        event.preventDefault();
        const localStream = this.props.call.getLocalStreams()[0];
        if (localStream.getVideoTracks().length > 0) {
            const track = localStream.getVideoTracks()[0];
            if (this.state.videoMuted) {
                DEBUG('Unmute camera');
                track.enabled = true;
                this.setState({ videoMuted: false, localVideoShow: true });
            } else {
                DEBUG('Mute camera');
                track.enabled = false;
                this.setState({ videoMuted: true });
            }
        }
    }

    hangupCall(event) {
        event.preventDefault();
        this.props.hangupCall();
    }

    escalateToConference(participants) {
        this.props.escalateToConference(participants);
    }

    armOverlayTimer() {
        clearTimeout(this.overlayTimer);
        this.overlayTimer = setTimeout(() => {
            // While viewing the remote's shared screen keep the top bar (with the
            // docked call controls) pinned — don't auto-hide it.
            if (this.state.remotePeerSharing || this.state.anchorEl) { return; }
            if (this.state.hasVideo) {
                this.setState({ callOverlayVisible: false });
            }
        }, 4000);
    }

    showCallOverlay() {
        if (!this.state.showInlineChat) {
            if (this.state.remoteVideoShow) {
                if (!this.state.callOverlayVisible) {
                    this.setState({ callOverlayVisible: true });
                }
                if (this.state.hasVideo) {
                    this.armOverlayTimer();
                }
            }
        }
    }

    toggleEscalateConferenceModal() {
        this.setState({
            anchorEl: null,
            callOverlayVisible: false,
            showEscalateConferenceModal: !this.state.showEscalateConferenceModal
        });
    }

    toggleSwitchMenu(event) {
        if (!event) {
            this.setState({
                showSwitchMenu: !this.state.showSwitchMenu,
                callOverlayVisible: true
            });
        } else {
            event.currentTarget.blur();
            this.setState({
                switchAnchor: event.currentTarget,
                showSwitchMenu: !this.state.showSwitchMenu,
                callOverlayVisible: true
            });
        }
        clearTimeout(this.overlayTimer);
    }

    toggleAudioSwitchMenu(event) {
        if (!event) {
            this.setState({
                showAudioSwitchMenu: !this.state.showAudioSwitchMenu,
                callOverlayVisible: true
            });
        } else {
            event.currentTarget.blur();
            this.setState({
                switchAnchor: event.currentTarget,
                showAudioSwitchMenu: !this.state.showAudioSwitchMenu,
                callOverlayVisible: true
            });
        }
        clearTimeout(this.overlayTimer);
    }

    toggleStatistics() {
        this.setState({
            anchorEl: null,
            showStatistics: !this.state.showStatistics
        });
    }

    toggleChatInCall() {
        this.setState({
            callOverlayVisible: true
        });
        this.props.toggleChatInCall();
        clearTimeout(this.overlayTimer);
    }

    toggleInlineChat() {
        this.setState({
            callOverlayVisible: true,
            showInlineChat: !this.state.showInlineChat
        });
        clearTimeout(this.overlayTimer);
    }

    incomingMessage(message) {
        if (this.props.inlineChat !== undefined) {
            if (this.props.call.remoteIdentity.uri === message.sender.uri) {
                if (!this.state.showInlineChat) {
                    this._notificationCenter.postNewMessage(message, () => {
                        this.toggleInlineChat();
                    });
                }
            } else {
                this._notificationCenter.postNewMessage(message, () => {
                    this.toggleChatInCall();
                });
            }
        }
    }

    uploadFiles(files, caption, uri) {
        this.setState({ upload: null });
        fileTransferUtils.upload(
            {
                notificationCenter: this.props.notificationCenter,
                account: this.props.call.account
            },
            files,
            uri,
            caption
        );
    };

    handleDrop(files) {
        DEBUG('Dropped file %o', [...files]);
        this.setState({
            upload: {
                files: files,
                uri: this.props.call.remoteIdentity.uri
            }
        });
    };

    handleFiles(e) {
        DEBUG('Selected files %o', e.target.files);
        this.setState({
            upload: {
                files: [...e.target.files],
                uri: this.props.call.remoteIdentity.uri
            }
        });
        e.target.value = '';
    }

    render() {
        if (this.props.call == null) {
            return (<div></div>);
        }
        const localVideoClasses = clsx({
            'video-thumbnail': true,
            'screen-fit': this.state.remotePeerSharing,
            'mirror': !this.props.call.sharingScreen && !this.props.generatedVideoTrack,
            'hidden': !this.state.localVideoShow,
            'animated': true,
            'fadeIn': this.state.localVideoShow || this.state.videoMuted,
            'fadeOut': this.state.videoMuted,
            'fit': this.props.call.sharingScreen
        });

        const remoteVideoClasses = clsx({
            'poster': !this.state.remoteVideoShow,
            'animated': true,
            'fadeIn': this.state.remoteVideoShow,
            'large': true,
            'fit': this.state.remoteSharesScreen,
            // While viewing the peer's shared screen, inset the video between the
            // title bar and the call buttons so the whole shared screen is
            // visible and nothing floats on top of it.
            'screen-fit': this.state.remotePeerSharing,
            'hide': !this.state.hasVideo
        });

        let callButtons;
        let watermark;

        // With the pointer on, the remote video is a click target — unless the
        // peer can't render a marker at the moment, which the cursor says too.
        let pointerCursor;
        if (this.state.pointerMode) {
            pointerCursor = (this.state.remotePointerCapable && this.state.remoteInApp)
                ? { cursor: 'crosshair' }
                : { cursor: 'not-allowed' };
        }

        const callQuality = (
            <CallQuality
                videoData={this.state.videoGraphData}
                audioData={this.state.audioGraphData}
            />
        );

        const baseLink = clsx(
            'btn',
            'btn-link',
        );

        const chatButtonClasses = clsx(
            baseLink,
        );

        const unreadMessages = (this.props.unreadMessages && this.props.unreadMessages.total - this.props.unreadMessages.call) || 0;
        const unreadCallMessages = this.props.unreadMessages && this.props.unreadMessages.call || 0;
        const menuItems = [];

        if (this.state.callOverlayVisible) {
            const muteButtonIcons = clsx({
                'fa': true,
                'fa-microphone': !this.state.audioMuted,
                'fa-microphone-slash': this.state.audioMuted
            });

            const muteVideoButtonIcons = clsx({
                'fa': true,
                'fa-video-camera': !this.state.videoMuted,
                'fa-video-camera-slash': this.state.videoMuted
            });

            const screenSharingButtonIcons = clsx({
                'fa': true,
                'fa-clone': true,
                'fa-flip-horizontal': true,
                'text-warning': this.props.call.sharingScreen
            });

            // Asking for the peer's screen: a monitor with an arrow pointing
            // our way, distinct from the share button's own icon. While a
            // request is in flight the icon spins and the button is disabled.
            const requestScreenButtonIcons = clsx({
                'fa': true,
                'fa-desktop': !this.state.screenRequestPending,
                'fa-circle-o-notch': this.state.screenRequestPending,
                'fa-spin': this.state.screenRequestPending
            });

            const commonButtonClasses = clsx({
                'btn': true,
                'btn-round': true,
                'btn-default': true
            });

            const menuButtonClasses = clsx({
                'btn': true,
                'btn-round-xs': true,
                'btn-default': true,
                'overlap': true,
                'overlap-top': true
            });

            const menuButtonIcons = clsx({
                'fa': true,
                'fa-caret-up': true
            });

            const shareButtonClasses = clsx(
                commonButtonClasses,
                this.props.classes.sharingButton
            );

            const shareFileButtonIcons = clsx({
                'fa': true,
                'fa-upload': true
            });
            const buttons = [];

            menuItems.push(<MenuItem style={{fontSize: '14px', fontFamily: 'inherit'}} onClick={() => { this.toggleStatistics(); }}>
                <ListItemIcon style={{minWidth: '18px', marginRight: '8px'}}><NetworkCheckIcon /></ListItemIcon>
                Statistics
            </MenuItem>)

            menuItems.push(<MenuItem style={{fontSize: '14px', fontFamily: 'inherit'}} onClick={() => { this.toggleEscalateConferenceModal(); }}>
                <ListItemIcon style={{minWidth: '18px', marginRight: '8px'}}><i className="fa fa-user-plus"></i></ListItemIcon>
                Escalate to conference
            </MenuItem>)

            // Ask the peer for THEIR screen. Hidden unless they advertised the
            // handshake, while either side is already presenting (there is
            // nothing to ask for), and while we have no video sender of our own
            // to have been asked through.
            if (!this.state.remotePeerSharing
                // && !this.props.call.sharingScreen
                && this.peerCanShareScreen()) {
                menuItems.push(
                    <MenuItem style={{fontSize: '14px', fontFamily: 'inherit'}}
                        disabled={this.state.screenRequestPending}
                        onClick={this.requestScreenShare}
                    >
                        <ListItemIcon style={{minWidth: '18px', marginRight: '8px'}}><i className={requestScreenButtonIcons}></i></ListItemIcon>
                        {this.state.screenRequestPending
                            ? `Waiting for ${this.peerLabel()}…`
                            : `Ask ${this.peerLabel()} to share the screen`}
                    </MenuItem>
                );
            }
            buttons.push(
                <div className="btn-container" key="video">
                    <button key="muteVideo" type="button" className={commonButtonClasses} onClick={this.muteVideo}> <i className={muteVideoButtonIcons}></i> </button>
                    <button key="videodevices" type="button" title="Select cameras" className={menuButtonClasses} onClick={this.toggleSwitchMenu}> <i className={menuButtonIcons}></i> </button>
                </div>
            );

            buttons.push(
                <div className="btn-container" key="audio">
                    <button key="muteAudio" type="button" className={commonButtonClasses} onClick={this.muteAudio}> <i className={muteButtonIcons}></i> </button>
                    <button key="audiodevices" type="button" title="Select audio devices" className={menuButtonClasses} onClick={this.toggleAudioSwitchMenu}> <i className={menuButtonIcons}></i> </button>
                </div>
            );

            buttons.push(<button key="shareScreen" type="button" title="Share screen" className={commonButtonClasses} onClick={this.props.shareScreen}><i className={screenSharingButtonIcons}></i></button>);

            buttons.push(
                <button key="more" type="button" title="More" className={commonButtonClasses} onClick={(e) => this.setState({anchorEl: e.currentTarget})}>
                    <i className="fa fa-ellipsis-h"></i>
                </button>
            );
            if (this.props.inlineChat) {
                buttons.push(<React.Fragment key="inlineChat">
                    <Badge key="unreadBadge" badgeContent={unreadCallMessages} color="primary" classes={{ badge: this.props.classes.badge }} overlap="circular">
                        <button key="inlineChatButton" type="button" className={commonButtonClasses} onClick={this.toggleInlineChat}>
                            <i className="fa fa-commenting-o"></i>
                        </button>
                    </Badge>
                    <input
                        style={{ display: 'none' }}
                        id="outlined-button-file"
                        multiple
                        type="file"
                        onChange={this.handleFiles}
                        key="1"
                    />
                    <label key="shareFiles" htmlFor="outlined-button-file">
                        <IconButton title="Share files" component="span" disableRipple={true} className={shareButtonClasses}>
                            <i className={shareFileButtonIcons}></i>
                        </IconButton>
                    </label></React.Fragment>);
            }
            if (this.state.remotePeerSharing && this.state.remotePointerCapable) {
                buttons.push(<button key="pointer" type="button" title={this.state.pointerMode ? 'Pointer on — click the remote screen' : 'Point at the remote screen'} className={clsx(commonButtonClasses, { 'active': this.state.pointerMode, 'btn-pointer-active': this.state.pointerMode })} onClick={this.togglePointerMode}><i className="fa fa-mouse-pointer"></i></button>);
            }
            if (!this.state.remotePeerSharing) {
                buttons.push(<br key="break" />);
            }
            buttons.push(<button key="hangupButton" type="button" className="btn btn-round-big btn-danger" onClick={this.hangupCall}> <i className="fa fa-phone rotate-135"></i> </button>);

            callButtons = (
                <CSSTransition
                    key="buttons"
                    classNames="videobuttons"
                    timeout={{ enter: 300, exit: 300 }}
                >
                    <div className="call-buttons">
                        {buttons}
                    </div>
                </CSSTransition>
            );
        } else {
            watermark = (
                <CSSTransition
                    key="watermark"
                    classNames="watermark"
                    timeout={{ enter: 600, exit: 300 }}
                >
                    <div className="watermark"></div>
                </CSSTransition>
            );
        }

        const callClasses = clsx({
            'drawer-wide-visible': this.state.showInlineChat && !utils.isMobile.any(),
            'drawer-visible': this.state.showInlineChat && utils.isMobile.any()
        });

        const topButtons = {
            top: {
                left: [],
                right: []
            }
        };

        const handleClose = () => {
            this.setState({anchorEl: null});
        };

        const menu = (
            <Menu
                open={Boolean(this.state.anchorEl)}
                anchorEl={this.state.anchorEl}
                onClose={handleClose}
                keepMounted={false}
                anchorOrigin={{ vertical: 'top', horizontal: 'left' }}
                transformOrigin={{ vertical: 'bottom', horizontal: 'left' }}
                getContentAnchorEl={null}
            >
                {menuItems}
            </Menu>
        );

        if (this.props.toggleChatInCall !== undefined) {
            topButtons.top.left = [
                <Badge
                    key="unreadBadge"
                    badgeContent={unreadMessages}
                    color="primary"
                    classes={{ badge: this.props.classes.badge }}
                    overlap="circular"
                >
                    <button key="chatButton" type="button" className={chatButtonClasses} onClick={this.toggleChatInCall} title="Chat screen">
                        <i className="fa fa-comments fa-2x" />
                    </button>
                </Badge>
            ]
        }

        if (this.isFullscreenSupported()) {
            const fullScreenButtonIcons = clsx({
                'fa': true,
                'fa-expand': !this.isFullScreen(),
                'fa-compress': this.isFullScreen(),
                'fa-2x': true
            });
            topButtons.top.right.push(<button key="fsButton" type="button" className={baseLink} onClick={this.handleFullscreen}> <i className={fullScreenButtonIcons}></i> </button>);
        }


        return (
            <React.Fragment>
                {this.state.ackEcho &&
                    <div
                        className="pointer-ack-echo"
                        style={{ left: this.state.ackEcho.left, top: this.state.ackEcho.top }}
                    />
                }
                {this.state.upload &&
                    <FileUploadModal
                        show={this.state.upload !== null}
                        close={() => {
                            this.setState({ upload: null });
                        }}
                        upload={this.state.upload}
                        onConfirm={this.uploadFiles}
                    />
                }
                <DragAndDrop title="Drop files to share them" handleDrop={this.handleDrop}>
                    <div className={callClasses}>
                        <SwitchDevicesMenu
                            show={this.state.showSwitchMenu}
                            anchor={this.state.switchAnchor}
                            close={this.toggleSwitchMenu}
                            call={this.props.call}
                            setDevice={this.props.setDevice}
                            direction="up"
                        />
                        <SwitchDevicesMenu
                            show={this.state.showAudioSwitchMenu}
                            anchor={this.state.switchAnchor}
                            close={this.toggleAudioSwitchMenu}
                            call={this.props.call}
                            setDevice={this.props.setDevice}
                            direction="up"
                            audio
                        />
                        {menu}

                        {!this.state.hasVideo &&
                            <div className="call-user-icon">
                                <UserIcon identity={this.props.contact.identity} large={true} active={this.state.active} />
                            </div>
                        }
                        <div className="video-container" onMouseMove={this.showCallOverlay}>
                            <CallOverlay
                                show={this.state.callOverlayVisible}
                                contact={this.props.contact}
                                call={this.props.call}
                                buttons={topButtons}
                                callQuality={callQuality}
                                remoteScreen={this.state.remotePeerSharing}
                            />
                            <TransitionGroup>
                                {watermark}
                            </TransitionGroup>
                            <video id="remoteVideo" className={remoteVideoClasses} poster="assets/images/transparent-1px.png" ref={this.remoteVideo} autoPlay onClick={this.sendPointer} style={pointerCursor} />
                            <video id="localVideo" className={localVideoClasses} ref={this.localVideo} autoPlay muted />
                            <TransitionGroup>
                                {callButtons}
                            </TransitionGroup>
                            <EscalateConferenceModal
                                show={this.state.showEscalateConferenceModal}
                                call={this.props.call}
                                close={this.toggleEscalateConferenceModal}
                                escalateToConference={this.escalateToConference}
                            />
                        </div>
                        <ConferenceDrawer
                            show={this.state.showStatistics}
                            anchor="left"
                            showClose={true}
                            close={this.toggleStatistics}
                            transparent={true}
                        >
                            <Statistics
                                videoData={this.state.videoGraphData}
                                audioData={this.state.audioGraphData}
                                lastData={this.state.lastData}
                                videoElements={{ remoteVideo: this.remoteVideo, localVideo: this.localVideo }}
                                video
                                details
                            />
                        </ConferenceDrawer>
                    </div>
                    <ConferenceDrawer
                        show={this.state.showInlineChat}
                        anchor="right"
                        showClose={true}
                        close={this.toggleInlineChat}
                        size={utils.isMobile.any() ? 'normal' : 'wide'}
                        noBackgroundColor
                    >
                        {this.props.inlineChat}
                    </ConferenceDrawer>
                </DragAndDrop>
            </React.Fragment>
        );
    }
}

VideoBox.propTypes = {
    classes: PropTypes.object.isRequired,
    setDevice: PropTypes.func.isRequired,
    shareScreen: PropTypes.func.isRequired,
    call: PropTypes.object,
    localMedia: PropTypes.object,
    hangupCall: PropTypes.func,
    escalateToConference: PropTypes.func,
    generatedVideoTrack: PropTypes.bool,
    unreadMessages: PropTypes.object,
    notificationCenter: PropTypes.func,
    toggleChatInCall: PropTypes.func,
    inlineChat: PropTypes.object,
    propagateKeyPress: PropTypes.bool,
    remoteAudio: PropTypes.object,
    contact: PropTypes.object
};

ReactMixin(VideoBox.prototype, FullscreenMixin);


module.exports = withStyles(styleSheet)(VideoBox);
