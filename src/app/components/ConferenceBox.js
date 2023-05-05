'use strict';

const React = require('react');
const PropTypes = require('prop-types');
const TransitionGroup = require('react-transition-group/TransitionGroup');
const CSSTransition = require('react-transition-group/CSSTransition');
const ReactMixin = require('react-mixin');
const ReactBootstrap = require('react-bootstrap');
const Popover = ReactBootstrap.Popover;
const OverlayTrigger = ReactBootstrap.OverlayTrigger;
const { withStyles } = require('@material-ui/core/styles');
const { IconButton, Badge } = require('@material-ui/core');
const {
    NetworkCheck: NetworkCheckIcon
} = require('@material-ui/icons');
const sylkrtc = require('sylkrtc');
const { default: clsx } = require('clsx');
const debug = require('debug');
const superagent = require('superagent');

const AudioPlayer = require('./AudioPlayer');
const CallQuality = require('./CallQuality');
const ConferenceDrawer = require('./ConferenceDrawer');
const ConferenceDrawerLog = require('./ConferenceDrawerLog');
const ConferenceDrawerFiles = require('./ConferenceDrawerFiles');
const ConferenceDrawerParticipant = require('./ConferenceDrawerParticipant');
const ConferenceDrawerParticipantList = require('./ConferenceDrawerParticipantList');
const ConferenceDrawerSpeakerSelection = require('./ConferenceDrawerSpeakerSelection');
const ConferenceDrawerMute = require('./ConferenceDrawerMute');
const ConferenceHeader = require('./ConferenceHeader');
const ConferenceCarousel = require('./ConferenceCarousel');
const ConferenceParticipant = require('./ConferenceParticipant');
const ConferenceMatrixParticipant = require('./ConferenceMatrixParticipant');
const ConferenceParticipantSelf = require('./ConferenceParticipantSelf');
const ConferenceChat = require('./ConferenceChat');
const ConferenceChatEditor = require('./ConferenceChatEditor');
const ConferenceMenu = require('./ConferenceMenu');
const DragAndDrop = require('./DragAndDrop');
const InviteParticipantsModal = require('./InviteParticipantsModal');
const MuteAudioParticipantsModal = require('./MuteAudioParticipantsModal');
const Statistics = require('./Statistics');
const SwitchDevicesModal = require('./SwitchDevicesModal');
const SwitchDevicesMenu = require('./SwitchDevicesMenu');
const UserIcon = require('./UserIcon');

const FullscreenMixin = require('../mixins/FullScreen');
const config = require('../config');
const utils = require('../utils');

const DEBUG = debug('blinkrtc:ConferenceBox');


const styleSheet = {
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
    },
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
    }
};
class ConferenceBox extends React.Component {
    constructor(props) {
        super(props);
        const data = new Array(60).fill({});

        this.state = {
            callOverlayVisible: true,
            audioMuted: false,
            videoMuted: this.shouldVideoMute(),
            participants: props.call.participants.slice(),
            showInviteModal: false,
            showMuteAudioParticipantsModal: false,
            showDrawer: false,
            showFiles: false,
            showInlineChat: false,
            showChat: false,
            showMenu: false,
            showSwitchModal: false,
            showSwitchMenu: false,
            showAudioSwitchMenu: false,
            shareOverlayVisible: false,
            activeSpeakers: props.call.activeParticipants.slice(),
            selfDisplayedLarge: false,
            eventLog: [],
            sharedFiles: props.call.sharedFiles.slice(),
            messages: props.call.messages.slice(),
            raisedHands: props.call.raisedHands.slice(),
            raisedHand: false,
            isComposing: false,
            newMessages: 0,
            shouldScroll: false,
            chatEditorFocus: false,
            menuAnchor: null,
            switchAnchor: null,
            videoGraphData: data,
            audioGraphData: data,
            showStatistics: false,
            lastData: {}
        };

        const friendlyName = this.props.remoteIdentity.split('@')[0];
        if (window.location.origin.startsWith('file://')) {
            this.callUrl = `${config.publicUrl}/conference/${friendlyName}`;
        } else {
            this.callUrl = `${window.location.origin}/conference/${friendlyName}`;
        }

        const emailMessage = `You can join me in the conference using a Web browser at ${this.callUrl} ` +
            'or Sylk app from https://sylkserver.com';
        const subject = 'Join me, maybe?';

        this.emailLink = `mailto:?subject=${encodeURI(subject)}&body=${encodeURI(emailMessage)}`;

        this.overlayTimer = null;
        this.logEvent = {};
        this.haveVideo = false;
        this.uploads = [];
        this.notifications = [];
        this.messageNotification = null;
        [
            'error',
            'warning',
            'info',
            'debug'
        ].forEach((level) => {
            this.logEvent[level] = (
                (action, messages, originator) => {
                    const log = this.state.eventLog.slice();
                    log.unshift({ originator, originator, level: level, action: action, messages: messages });
                    this.setState({ eventLog: log });
                }
            );
        });

        // ES6 classes no longer autobind
        [
            'showOverlay',
            'handleFullscreen',
            'muteAudio',
            'muteGuestAudioOnJoin',
            'muteVideo',
            'hangup',
            'onParticipantJoined',
            'onParticipantLeft',
            'onParticipantStateChanged',
            'onConfigureRoom',
            'onFileSharing',
            'onMessage',
            'onComposing',
            'onMuteAudio',
            'onRaisedHands',
            'onKeyDown',
            'maybeSwitchLargeVideo',
            'handleClipboardButton',
            'handleEmailButton',
            'handleShareOverlayEntered',
            'handleShareOverlayExited',
            'handleActiveSpeakerSelected',
            'handleSend',
            'handleTyping',
            'handleDrop',
            'handleFiles',
            'handleMuteAudioParticipants',
            'handleToggleHand',
            'handleHandSelected',
            'downloadFile',
            'toggleInviteModal',
            'toggleMuteAudioParticipantsModal',
            'toggleDrawer',
            'toggleFiles',
            'toggleChat',
            'toggleChatEditorFocus',
            'toggleMenu',
            'toggleStatistics',
            'toggleSwitchModal',
            'toggleSwitchMenu',
            'toggleAudioSwitchMenu',
            'toggleChatInCall',
            'toggleCall',
            'showFiles',
            'setScroll',
            'preventOverlay',
            'statistics',
            'incomingMessage'
        ].forEach((name) => {
            this[name] = this[name].bind(this);
        });

        this.participantStats = {};
    }

    componentDidMount() {
        for (let p of this.state.participants) {
            p.on('stateChanged', this.onParticipantStateChanged);
            p.attach();
        }
        this.props.call.on('participantJoined', this.onParticipantJoined);
        this.props.call.on('participantLeft', this.onParticipantLeft);
        this.props.call.on('roomConfigured', this.onConfigureRoom);
        this.props.call.on('fileSharing', this.onFileSharing);
        this.props.call.on('message', this.onMessage);
        this.props.call.on('composingIndication', this.onComposing);
        this.props.call.on('muteAudio', this.onMuteAudio);
        this.props.call.on('raisedHands', this.onRaisedHands);

        this.props.call.statistics.on('stats', this.statistics);
        this.props.call.account.on('incomingMessage', this.incomingMessage);

        this.armOverlayTimer();

        // attach to ourselves first if there are no other participants
        if (this.state.participants.length === 0) {
            setTimeout(() => {
                const item = {
                    stream: this.props.call.getLocalStreams()[0],
                    identity: this.props.call.localIdentity
                };
                this.selectVideo(item, true);
            });
        } else {
            // this.changeResolution();
        }

        if (this.props.call.getLocalStreams()[0].getVideoTracks().length !== 0) {
            this.haveVideo = true;
        }

        if (this.state.activeSpeakers.length > 0 || (this.props.participantIsGuest && config.muteGuestAudioOnJoin)) {
            this.muteGuestAudioOnJoin();
        }

        if (this.props.call.supportsVideo === false || this.props.lowBandwidth) {
            this.haveVideo = false;
            this.toggleChat();
            this.toggleDrawer();
        }
        // Keyboard shortcuts
        document.addEventListener('keydown', this.onKeyDown);
    }

    componentWillUnmount() {
        clearTimeout(this.overlayTimer);
        this.uploads.forEach((upload) => {
            this.props.notificationCenter().removeNotification(upload[1]);
            upload[0].abort();
        });
        this.notifications.forEach((notification) => {
            this.props.notificationCenter().removeNotification(notification);
        });
        this.exitFullscreen();
        document.removeEventListener('keydown', this.onKeyDown);
        this.props.call.statistics.removeListener('stats', this.statistics);
        this.props.call.account.removeListener('incomingMessage', this.incomingMessage);
    }

    statistics(stats) {
        const videoData = stats.data.video;
        const audioData = stats.data.audio;

        const audioRemoteData = stats.data.remote.audio;
        const videoRemoteData = stats.data.remote.video;

        const videoRemoteExists = videoRemoteData.inbound[0];
        const audioRemoteExists = audioRemoteData.inbound[0];

        if (stats.peerId !== this.props.call.id) {
            if (!this.participantStats[stats.peerId]) {
                this.participantStats[stats.peerId] = {};
                this.participantStats[stats.peerId].packetLossData = new Array(30);
                this.participantStats[stats.peerId].packetLossData.fill({});
            }

            const data = this.participantStats[stats.peerId];
            data.lastData = stats;

            let packetLossRate = 0;
            let packetRate = 0;

            const audioDataInbound = audioData && audioData.inbound && audioData.inbound[0];
            if (audioDataInbound) {
                packetRate = audioDataInbound.packetRate;
                packetLossRate = audioDataInbound.packetLossRate;
            }

            const audioDataOutbound = audioData && audioData.outbound && audioData.outbound[0];
            if (audioDataOutbound && audioRemoteExists) {
                packetRate = packetRate + audioDataOutbound.packetRate;
                packetLossRate = packetLossRate + audioRemoteData.inbound[0].packetLossRate;
            }

            const videoDataInbound = videoData && videoData.inbound && videoData.inbound[0];
            if (videoDataInbound) {
                packetRate = videoDataInbound.packetRate;
                packetLossRate = packetLossRate + videoDataInbound.packetLossRate;
            }

            const videoDataOutbound = videoData && videoData.outbound && videoData.outbound[0];
            if (videoDataOutbound && videoRemoteExists) {
                packetRate = packetRate + videoDataOutbound.packetRate;
                packetLossRate = packetLossRate + videoRemoteData.inbound[0].packetLossRate;
            }
            data.packetLossData = data.packetLossData.concat({
                packetsLostInbound: packetLossRate,
                packetRateInbound: packetRate,
                latency: 0
            });

            data.packetLossData.shift();
            return
        }

        if (!videoRemoteExists && !audioRemoteExists) {
            return;
        }

        let inboundVideoBitrate = 0;
        let inboundAudioBitrate = 0;

        let audioPacketsLostInboundData = 0;
        let videoPacketsLostInboundData = 0;

        let audioPacketRateInbound = 0;
        let videoPacketRateInbound = 0;

        this.state.participants.forEach((p) => {
            if (this.participantStats[p.id]) {
                const participantVideoData = this.participantStats[p.id].lastData.data.video;
                if (participantVideoData && participantVideoData.inbound && participantVideoData.inbound[0]) {
                    inboundVideoBitrate = inboundVideoBitrate + participantVideoData.inbound[0].bitrate;
                    videoPacketsLostInboundData = videoPacketsLostInboundData + participantVideoData.inbound[0].packetLossRate;
                    videoPacketRateInbound = videoPacketRateInbound + participantVideoData.inbound[0].packetRate;
                }
                const participantAudioData = this.participantStats[p.id].lastData.data.audio;
                if (participantAudioData && participantAudioData.inbound && participantAudioData.inbound[0]) {
                    inboundAudioBitrate = inboundVideoBitrate + participantAudioData.inbound[0].bitrate;
                    audioPacketsLostInboundData = audioPacketsLostInboundData + participantAudioData.inbound[0].packetLossRate;
                    audioPacketRateInbound = audioPacketRateInbound + participantAudioData.inbound[0].packetRate;
                }
            }
        });

        const videoJitter = 0;
        const videoRTT = videoRemoteExists && videoRemoteData.inbound[0].roundTripTime || 0
        const videoPacketsLostOutbound = videoRemoteExists && videoRemoteData.inbound[0].packetLossRate || 0
        const videoPacketsLostInbound = videoPacketsLostInboundData;

        const audioJitter = 0;
        const audioRTT = audioRemoteExists && audioRemoteData.inbound[0].roundTripTime || 0;
        const audioPacketsLostOutbound = audioRemoteExists && audioRemoteData.inbound[0].packetLossRate || 0;
        const audioPacketsLostInbound = audioPacketsLostInboundData;

        let packetRate = 0;
        let audioPacketRateOutbound = 0;
        let videoPacketRateOutbound = 0;

        const audioDataOutbound = audioData && audioData.outbound && audioData.outbound[0];
        if (audioDataOutbound && audioRemoteExists) {
            packetRate = packetRate + audioDataOutbound.packetRate;
            audioPacketRateOutbound = audioDataOutbound.packetRate;

        }

        const videoDataOutbound = videoData && videoData.outbound && videoData.outbound[0];
        if (videoDataOutbound && videoRemoteExists) {
            packetRate = packetRate + videoDataOutbound.packetRate;
            videoPacketRateOutbound = videoDataOutbound.packetRate;
        }

        const addData = {
            video: {},
            audio: {
                timestamp: audioData.timestamp,
                incomingBitrate: inboundAudioBitrate,
                outgoingBitrate: audioData.outbound[0].bitrate || 0,
                latency: audioRTT / 2,
                jitter: audioJitter,
                packetsLostOutbound: audioPacketsLostOutbound,
                packetsLostInbound: audioPacketsLostInbound,
                packetRateOutbound: audioPacketRateOutbound,
                packetRateInbound: audioPacketRateInbound
            }
        };
        if (videoRemoteExists) {
            addData.video = {
                timestamp: videoData.timestamp,
                incomingBitrate: inboundVideoBitrate,
                outgoingBitrate: videoData.outbound[0].bitrate || 0,
                latency: videoRTT / 2,
                jitter: videoJitter,
                packetsLostOutbound: videoPacketsLostOutbound,
                packetsLostInbound: videoPacketsLostInbound,
                packetRateOutbound: videoPacketRateOutbound,
                packetRateInbound: videoPacketRateInbound
            }
        }

        this.setState(state => {
            const videoGraphData = state.videoGraphData.concat(addData.video);
            videoGraphData.shift();
            const audioGraphData = state.audioGraphData.concat(addData.audio);
            audioGraphData.shift();
            return {
                videoGraphData,
                audioGraphData,
                lastData: stats.data
            };
        });
    }

    shouldVideoMute() {
        if (this.props.call.supportsVideo === false) {
            const localStream = this.props.call.getLocalStreams()[0];
            if (localStream.getVideoTracks().length > 0) {
                const track = localStream.getVideoTracks()[0];
                track.enabled = false;
                track.stop();
                return true;
            }
        } else {
            return false;
        }
    }

    incomingMessage(message) {
        if (!this.state.showChat) {
            this.notifications.push(this.props.notificationCenter().postNewMessage(message, () => {
                this.toggleChatInCall();
            }));
        }
    }

    onParticipantJoined(p) {
        DEBUG(`Participant joined: ${p.identity}`);
        this.refs.audioPlayerParticipantJoined.play();
        p.on('stateChanged', this.onParticipantStateChanged);
        p.attach();
        this.setState({
            participants: this.state.participants.concat([p])
        });
        // this.changeResolution();
    }

    onParticipantLeft(p) {
        DEBUG(`Participant left: ${p.identity}`);
        this.refs.audioPlayerParticipantLeft.play();
        const participants = this.state.participants.slice();
        const idx = participants.indexOf(p);
        if (idx !== -1) {
            participants.splice(idx, 1);
            this.setState({
                participants: participants
            });
        }
        p.detach(true);
        // this.changeResolution();
    }

    onParticipantStateChanged(oldState, newState) {
        if (newState === 'established' || newState === null) {
            this.maybeSwitchLargeVideo();
        }
    }

    onConfigureRoom(config) {
        const newState = {};
        newState.activeSpeakers = config.activeParticipants;
        this.setState(newState);

        if (config.activeParticipants.length === 0) {
            this.logEvent.info('set speakers to', ['Nobody'], config.originator);
        } else {
            const speakers = config.activeParticipants.map((p) => { return p.identity.displayName || p.identity.uri });
            this.logEvent.info('set speakers to', speakers, config.originator);
        }
        this.maybeSwitchLargeVideo();
    }

    onFileSharing(files) {
        let stateFiles = this.state.sharedFiles.slice();
        stateFiles = stateFiles.concat(files);
        this.setState({ sharedFiles: stateFiles });
        files.forEach((file) => {
            if (file.session !== this.props.call.id) {
                this.props.notificationCenter().postFileShared(file, this.showFiles);
            }
        });
    }

    onMessage(message) {
        let stateMessages = this.state.messages.slice();
        let newMessages = this.state.newMessages;

        if (message.type === 'normal'
            && !message.content.startsWith('?OTRv')
            && !this.state.showInlineChat
            && this.props.call.supportsVideo !== false
            && !this.props.lowBandwidth
        ) {
            newMessages += 1;
            if (this.messageNotification !== null) {
                this.props.notificationCenter().removeNotification(this.messageNotification);
            }
            if (newMessages === 1) {
                this.messageNotification = this.props.notificationCenter().postNewMessage(message, () => {
                    this.setState({ showInlineChat: true })
                });
            }
        }
        stateMessages.push(message);
        this.setState({ messages: stateMessages, newMessages: newMessages });
    }

    onComposing(indication) {
        if (indication.state === 'active') {
            this.setState({ isComposing: true });
        } else {
            this.setState({ isComposing: false });
        }
    }

    onMuteAudio(message) {
        this.logEvent.info('muted audio from', ['Everybody'], message.originator);
        if (message.originator != this.props.call.localIdentity && !this.state.audioMuted) {
            const localStream = this.props.call.getLocalStreams()[0];
            if (localStream.getAudioTracks().length > 0) {
                const track = localStream.getAudioTracks()[0];
                DEBUG('Mute audio on event from %o', message.originator);
                track.enabled = false;
                this.setState({ audioMuted: true });
                this.notifications.push(this.props.notificationCenter().postMutedBy(message.originator));
            }
        }
    }

    onRaisedHands(message) {
        let raisedHand = true;
        if (message.raisedHands.findIndex((element) => { return element.id === this.props.call.id }) === -1) {
            raisedHand = false;
        }

        const raisedHands = this.state.raisedHands.slice();
        if (raisedHands.length < message.raisedHands.length) {
            const diff = message.raisedHands.filter((element) => { return raisedHands.findIndex((elem) => { return elem.id === element.id }) });
            if (diff.length > 0 && diff[0].id !== this.props.call.id) {
                this.props.notificationCenter().postRaisedHand(diff[0].identity);
            }
        }
        this.setState({ raisedHands: message.raisedHands, raisedHand: raisedHand });
    }

    onKeyDown(event) {
        if (!this.state.showInviteModal && !this.state.chatEditorFocus) {
            if (event.ctrlKey || event.metaKey) {
                return;
            }
            switch (event.which) {
                case 67:    // c/C
                    event.preventDefault();
                    if (this.props.call.supportsVideo === true && !this.props.lowBandwidth) {
                        this.toggleChat();
                    }
                    break;
                case 68:    // d/D
                    event.preventDefault();
                    this.toggleSwitchModal();
                    break;
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
                case 72:    // h/H
                    event.preventDefault();
                    this.handleToggleHand();
                    break;
                case 70:    // f/F
                    event.preventDefault();
                    this.toggleFullscreen();
                    break;
                case 32:    // space
                    event.preventDefault();
                    if (this.state.activeSpeakers.length === 1) {
                        let next = this.state.activeSpeakers.findIndex((element) => { return element.id === this.props.call.id })
                        let nextParticipant;
                        if (next === 1) {
                            nextParticipant = this.state.participants[0];
                        } else {
                            next = this.state.participants.indexOf(this.state.activeSpeakers[0]) + 1;
                            if (next == this.state.participants.length) {
                                nextParticipant = { id: this.props.call.id, publisherId: this.props.call.id, identity: this.props.call.localIdentity }
                            } else {
                                nextParticipant = this.state.participants[next];
                            }
                        }

                        this.handleActiveSpeakerSelected(nextParticipant);
                    }
                    break;
                default:
                    break;
            }
        }
    }

    changeResolution() {
        let stream = this.props.call.getLocalStreams()[0];
        if (this.state.participants.length < 2) {
            this.props.call.scaleLocalTrack(stream, 1.5);
        } else if (this.state.participants.length < 5) {
            this.props.call.scaleLocalTrack(stream, 2);
        } else {
            this.props.call.scaleLocalTrack(stream, 1);
        }
    }

    selectVideo(item, self = false) {
        DEBUG('Switching video to: %o', item);
        if (item.stream) {
            sylkrtc.utils.attachMediaStream(item.stream, this.refs.largeVideo, { muted: self });
            this.setState({ selfDisplayedLarge: true });
        }
    }

    maybeSwitchLargeVideo() {
        // Switch the large video to another source, maybe.
        if (this.state.participants.length === 0 && !this.state.selfDisplayedLarge) {
            // none of the participants are eligible, show ourselves
            const item = {
                stream: this.props.call.getLocalStreams()[0],
                identity: this.props.call.localIdentity
            };
            this.selectVideo(item, true);
        } else if (this.state.selfDisplayedLarge) {
            this.setState({ selfDisplayedLarge: false });
        }
    }

    handleFullscreen(event) {
        event.preventDefault();
        this.toggleFullscreen(document.body);
        setTimeout(() => { this.forceUpdate() }, 100);
    }

    handleClipboardButton() {
        utils.copyToClipboard(this.callUrl);
        this.props.notificationCenter().postSystemNotification('Join me, maybe?', { body: 'Link copied to the clipboard' });
        this.refs.shareOverlay.hide();
    }

    handleEmailButton(event) {
        if (navigator.userAgent.indexOf('Chrome') > 0) {
            let emailWindow = window.open(this.emailLink, '_blank');
            setTimeout(() => {
                emailWindow.close();
            }, 500);
        } else {
            window.open(this.emailLink, '_self');
        }
        this.refs.shareOverlay.hide();
    }

    handleShareOverlayEntered() {
        // keep the buttons and overlay visible
        clearTimeout(this.overlayTimer);
        this.setState({ shareOverlayVisible: true });
    }

    handleShareOverlayExited() {
        // re-arm the buttons and overlay timeout
        if (!this.state.showDrawer && !this.state.showFiles && this.props.call.supportsVideo && !this.props.lowBandwidth) {
            this.armOverlayTimer();
        }
        this.setState({ shareOverlayVisible: false });
    }

    handleActiveSpeakerSelected(participant, secondVideo = false) {      // eslint-disable-line space-infix-ops
        let newActiveSpeakers = this.state.activeSpeakers.slice();
        if (secondVideo) {
            if (participant.id !== 'none') {
                if (newActiveSpeakers.length >= 1) {
                    newActiveSpeakers[1] = participant;
                } else {
                    newActiveSpeakers[0] = participant;
                }
            } else {
                newActiveSpeakers.splice(1, 1);
            }
        } else {
            if (participant.id !== 'none') {
                newActiveSpeakers[0] = participant;
            } else {
                newActiveSpeakers.shift();
            }
        }
        this.props.call.configureRoom(newActiveSpeakers.map((element) => element.publisherId), (error) => {
            if (error) {
                // This causes a state update, hence the drawer lists update
                this.logEvent.error('set speakers failed', [], this.localIdentity);
            }
        });
    }

    handleDrop(files) {
        DEBUG('Dropped file %o', files);
        this.uploadFiles(files);
    };

    handleFiles(e) {
        DEBUG('Selected files %o', e.target.files);
        this.uploadFiles(e.target.files);
        event.target.value = '';
    }

    handleSend(message, type) {
        let msg = this.props.call.sendMessage(message, type);
        let stateMessages = this.state.messages.slice();
        stateMessages.push(msg);
        this.setState({ messages: stateMessages });
    }

    handleTyping(state) {
        this.props.call.sendComposing(state);
    }

    handleMuteAudioParticipants() {
        DEBUG('Mute all participants');
        this.props.call.muteAudioParticipants();
    }

    handleToggleHand() {
        this.props.call.toggleHand();
        this.setState({ raisedHand: !this.state.raisedHand });
    }

    handleHandSelected(participant) {
        DEBUG('%o', participant);
        if (this.state.activeSpeakers.length !== 0) {
            if (this.state.activeSpeakers.length !== 2) {
                this.handleActiveSpeakerSelected(participant, true);
            } else {
                let index = this.state.activeSpeakers.findIndex((element) => { return element.id === this.props.call.id })
                if (index !== -1) {
                    if (index == 1) {
                        this.handleActiveSpeakerSelected(participant);
                    } else {
                        this.handleActiveSpeakerSelected(participant, true);
                    }
                } else {
                    this.handleActiveSpeakerSelected(participant);
                }
            }
        } else {
            this.handleActiveSpeakerSelected(participant)
        }
        this.props.call.toggleHand(participant.publisherId);
    }

    uploadFiles(files) {
        for (var key in files) {
            // is the item a File?
            if (files.hasOwnProperty(key) && files[key] instanceof File) {
                let uploadRequest;
                let complete = false;
                const filename = files[key].name
                let progressNotification = this.props.notificationCenter().postFileUploadProgress(
                    filename,
                    (notification) => {
                        if (!complete) {
                            uploadRequest.abort();
                            this.uploads.splice(this.uploads.indexOf(uploadRequest), 1);
                        }
                    }
                );
                uploadRequest = superagent
                    .post(`${config.fileSharingUrl}/${this.props.remoteIdentity}/${this.props.call.id}/${filename}`)
                    .send(files[key])
                    .on('progress', (e) => {
                        this.props.notificationCenter().editFileUploadNotification(e.percent, progressNotification);
                    })
                    .end((err, response) => {
                        complete = true;
                        this.props.notificationCenter().removeFileUploadNotification(progressNotification);
                        if (err) {
                            this.props.notificationCenter().postFileUploadFailed(filename);
                        }
                        this.uploads.splice(this.uploads.indexOf(uploadRequest), 1);
                    });
                this.uploads.push([uploadRequest, progressNotification]);
            }
        }
    }

    setScroll() {
        this.setState({ shouldScroll: !this.state.shouldScroll });
    }

    downloadFile(filename) {
        const a = document.createElement('a');
        a.href = `${config.fileSharingUrl}/${this.props.remoteIdentity}/${this.props.call.id}/${filename}`;
        a.target = '_blank';
        a.download = filename;
        const clickEvent = document.createEvent('MouseEvent');
        clickEvent.initMouseEvent('click', true, true, window, 0,
            clickEvent.screenX, clickEvent.screenY, clickEvent.clientX, clickEvent.clientY,
            clickEvent.ctrlKey, clickEvent.altKey, clickEvent.shiftKey, clickEvent.metaKey,
            0, null);
        a.dispatchEvent(clickEvent);
    }

    preventOverlay(event) {
        // Stop the overlay when we are the thumbnail bar
        event.stopPropagation();
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
                this.notifications.forEach((notification) => {
                    this.props.notificationCenter().removeNotification(notification);
                });
            } else {
                DEBUG('Mute microphone');
                track.enabled = false;
                this.setState({ audioMuted: true });
            }
        }
    }

    muteGuestAudioOnJoin() {
        const localStream = this.props.call.getLocalStreams()[0];
        if (localStream.getAudioTracks().length > 0) {
            const track = localStream.getAudioTracks()[0];
            DEBUG('Mute microphone, guest participant');
            track.enabled = false;
            this.setState({ audioMuted: true });
            this.notifications.push(this.props.notificationCenter().postMutedOnStart());
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
                this.setState({ videoMuted: false });
            } else {
                DEBUG('Mute camera');
                track.enabled = false;
                this.setState({ videoMuted: true });
            }
        }
    }

    hangup(event) {
        event.preventDefault();
        for (let participant of this.state.participants) {
            participant.detach();
        }
        if (typeof this.refs.largeVideo !== 'undefined') {
            this.refs.largeVideo.pause();
        }
        this.props.hangup();
    }

    armOverlayTimer() {
        clearTimeout(this.overlayTimer);
        this.overlayTimer = setTimeout(() => {
            this.setState({ callOverlayVisible: false });
        }, 4000);
    }

    showOverlay() {
        if (!this.state.shareOverlayVisible
            && !this.state.showDrawer
            && !this.state.showFiles
            && this.props.call.supportsVideo
            && !this.props.lowBandwidth
            && !this.state.showChat
            && !this.state.showInlineChat
        ) {
            if (!this.state.callOverlayVisible) {
                this.setState({ callOverlayVisible: true });
            }
            this.armOverlayTimer();
        }
    }

    toggleInviteModal() {
        this.setState({ showInviteModal: !this.state.showInviteModal });
        if (this.refs.showOverlay) {
            this.refs.shareOverlay.hide();
        }
    }

    toggleMuteAudioParticipantsModal() {
        this.setState({ showMuteAudioParticipantsModal: !this.state.showMuteAudioParticipantsModal });
    }

    toggleDrawer() {
        this.setState({ callOverlayVisible: true, showDrawer: !this.state.showDrawer, showFiles: false, showInlineChat: false });
        clearTimeout(this.overlayTimer);
    }

    toggleFiles() {
        this.setState({ callOverlayVisible: true, showFiles: !this.state.showFiles, showDrawer: false });
        clearTimeout(this.overlayTimer);
    }

    toggleChat() {
        if (this.messageNotification !== null) {
            this.props.notificationCenter().removeNotification(this.messageNotification);
        }
        this.setState({
            callOverlayVisible: true,
            showInlineChat: !this.state.showInlineChat,
            newMessages: 0,
            showDrawer: false
        });
        clearTimeout(this.overlayTimer);
    }

    toggleChatInCall() {
        if (!this.state.showChat) {
            this.setState({
                showChat: !this.state.showChat,
                callOverlayVisible: true
            });
            clearTimeout(this.overlayTimer);
            this.props.toggleChatInCall();
        }
    }

    toggleCall() {
        if (this.state.showChat) {
            this.setState({
                showChat: !this.state.showChat,
                callOverlayVisible: true
            });
            clearTimeout(this.overlayTimer);
            this.props.toggleChatInCall();
        }
    }

    toggleStatistics() {
        this.setState({
            showStatistics: !this.state.showStatistics
        });
    }

    toggleChatEditorFocus() {
        this.props.propagateKeyPress(this.state.chatEditorFocus);
        this.setState({ chatEditorFocus: !this.state.chatEditorFocus });
    }

    toggleMenu(event) {
        this.setState({ menuAnchor: event.currentTarget, showMenu: !this.state.showMenu, callOverlayVisible: true });
        clearTimeout(this.overlayTimer);
    }

    toggleSwitchModal() {
        this.setState({
            showSwitchModal: !this.state.showSwitchModal
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

    showFiles() {
        this.setState({ callOverlayVisible: true, showFiles: true, showDrawer: false, showInlineChat: false });
        clearTimeout(this.overlayTimer);
    }

    render() {
        if (this.props.call === null) {
            return (<div></div>);
        }

        let watermark;

        let chatLayout = this.props.call.supportsVideo === false || this.props.lowBandwidth;

        const unreadMessages = (this.props.unreadMessages && this.props.unreadMessages.total) || 0;

        const largeVideoClasses = clsx({
            'animated': true,
            'fadeIn': true,
            'large': true,
            'mirror': !this.props.call.sharingScreen && !this.props.generatedVideoTrack,
            'fit': this.props.call.sharingScreen,
            'hide': chatLayout || !this.haveVideo
        });

        let matrixClasses = clsx({
            'matrix': true
        });

        const containerClasses = clsx({
            'video-container': true,
            'conference': true,
            'drawer-visible': (this.state.showDrawer || (this.state.showInlineChat || this.state.showFiles) && utils.isMobile.any()) && !this.state.showChat,
            'drawer-wide-visible': (this.state.showInlineChat || this.state.showFiles) && !this.state.showChat && !utils.isMobile.any()
        });

        const remoteIdentity = this.props.remoteIdentity.split('@')[0];

        const shareOverlay = (
            <Popover id="shareOverlay" bsClass={!chatLayout ? 'popover' : 'on-top popover'} title="Join me, maybe?">
                <p>
                    Invite other online users of this service, share <strong><a href={this.callUrl} target="_blank" rel="noopener noreferrer">this link</a></strong> with others or email, so they can easily join this conference.
                </p>
                <div className="text-center">
                    <div className="btn-group">
                        <button className="btn btn-primary" onClick={this.toggleInviteModal} alt="Invite users">
                            <i className="fa fa-user-plus"></i>
                        </button>
                        <button className="btn btn-primary" onClick={this.handleClipboardButton} alt="Copy to clipboard">
                            <i className="fa fa-clipboard"></i>
                        </button>
                        <button className="btn btn-primary" onClick={this.handleEmailButton} alt="Send email">
                            <i className="fa fa-envelope-o"></i>
                        </button>
                    </div>
                </div>
            </Popover>
        );

        const buttons = {};

        const commonButtonTopClasses = clsx({
            'btn': true,
            'btn-link': true
        });

        const fullScreenButtonIcons = clsx({
            'fa': true,
            'fa-2x': true,
            'fa-expand': !this.isFullScreen(),
            'fa-compress': this.isFullScreen()
        });

        const handClasses = clsx({
            'fa': true,
            'fa-2x': true,
            'fa-hand-o-up': true,
            'text-primary': this.state.raisedHand
        });

        const callButtonClasses = clsx(
            commonButtonTopClasses,
            {
                'active': !this.state.showChat,
                'blink': this.state.showChat
            }
        );

        const topButtons = [];
        if (!this.state.showChat) {
            topButtons.push(
                <button key="handButton" type="button" title="Raise Hand" className={commonButtonTopClasses} onClick={this.handleToggleHand}> <i className={handClasses}></i> </button>
            );
        }
        if (this.isFullscreenSupported()) {
            topButtons.push(<button key="fsButton" type="button" title="Go full-screen" className={commonButtonTopClasses} onClick={this.handleFullscreen}> <i className={fullScreenButtonIcons}></i> </button>);
        }

        if (!this.state.showChat) {
            topButtons.push(
                <button key="moreActions" title="More Actions" aria-label="Toggle more actions menu" className={commonButtonTopClasses} onClick={this.toggleMenu} aria-haspopup="true" aria-controls="conference-menu">
                    <i className="fa fa-ellipsis-v fa-2x"></i>
                </button>
            );

            if (!this.state.showDrawer) {
                topButtons.push(<button key="sbButton" type="button" title="Open Drawer" className={commonButtonTopClasses} onClick={this.toggleDrawer}> <i className="fa fa-bars fa-2x"></i> </button>);
            }
        }

        const topLeftButtons = [];
        if (!this.props.participantIsGuest) {
            if (!utils.isMobile.any()) {
                topLeftButtons.push(
                    <Badge key="unreadBadge" badgeContent={unreadMessages} color="primary" classes={{ root: this.props.classes.root, badge: this.props.classes.badge }} overlap="circular">
                        <button key="chatButton" type="button" className={commonButtonTopClasses} onClick={this.toggleChatInCall}>
                            <i className="fa fa-comments fa-2x" />
                        </button>
                    </Badge>
                );
                topLeftButtons.push(
                    <button key="callButton" type="button" className={callButtonClasses} onClick={this.toggleCall}>
                        <i className="fa fa-2x fa-phone" />
                    </button>
                );
            } else {
                if (this.state.showChat) {
                    topLeftButtons.push(
                        <button key="callButton" type="button" className={callButtonClasses} onClick={this.toggleCall}>
                            <i className="fa fa-2x fa-phone" />
                        </button>
                    );
                } else {
                    topLeftButtons.push(
                        <Badge key="unreadBadge" badgeContent={unreadMessages} color="primary" classes={{ root: this.props.classes.root, badge: this.props.classes.badge }} overlap="circular">
                            <button key="chatButton" type="button" className={commonButtonTopClasses} onClick={this.toggleChatInCall}>
                                <i className="fa fa-comments fa-2x" />
                            </button>
                        </Badge>
                    );
                }
            }
        }
        buttons.top = { left: topLeftButtons, right: topButtons };


        const commonButtonClasses = clsx({
            'btn': true,
            'btn-round': true,
            'btn-default': true
        });

        const shareButtonClasses = clsx(
            commonButtonClasses,
            this.props.classes.sharingButton
        );

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

        const shareFileButtonIcons = clsx({
            'fa': true,
            'fa-upload': true
        });

        const menuButtonClasses = clsx({
            'btn': true,
            'btn-round-xs': true,
            'btn-default': true,
            'overlap': true
        });

        const menuButtonIcons = clsx({
            'fa': true,
            'fa-caret-down': !chatLayout,
            'fa-caret-right': chatLayout
        });

        const bottomButtons = [];
        bottomButtons.push(
            <button key="statisticsBtn" type="button" className={commonButtonClasses} onClick={this.toggleStatistics}>
                <NetworkCheckIcon />
            </button>
        );
        bottomButtons.push(
            <OverlayTrigger key="shareOverlay" ref="shareOverlay" trigger="click" placement={!chatLayout ? 'bottom' : 'right'} overlay={shareOverlay} onEntered={this.handleShareOverlayEntered} onExited={this.handleShareOverlayExited} rootClose>
                <button key="shareButton" type="button" title="Share link to this conference" className={commonButtonClasses}> <i className="fa fa-user-plus"></i> </button>
            </OverlayTrigger>
        );
        if (!chatLayout) {
            bottomButtons.push(
                <div className="btn-container" key="video">
                    <button key="muteVideo" type="button" title="Mute/unmute video" className={commonButtonClasses} onClick={this.muteVideo} disabled={!this.haveVideo}> <i className={muteVideoButtonIcons}></i> </button>
                    <button key="videodevices" type="button" title="Select cameras" className={menuButtonClasses} onClick={this.toggleSwitchMenu} disabled={!this.haveVideo}> <i className={menuButtonIcons}></i> </button>
                </div>
            );
        }
        bottomButtons.push(
            <div className="btn-container" key="audio">
                <button key="muteAudio" type="button" title="Mute/unmute audio" className={commonButtonClasses} onClick={this.muteAudio}> <i className={muteButtonIcons}></i> </button>
                <button key="audiodevices" type="button" title="Select audio devices" className={menuButtonClasses} onClick={this.toggleAudioSwitchMenu}> <i className={menuButtonIcons}></i> </button>
            </div>
        );
        if (!chatLayout) {
            bottomButtons.push(<button key="shareScreen" type="button" title="Share screen" className={commonButtonClasses} onClick={this.props.shareScreen} disabled={!this.haveVideo}><i className={screenSharingButtonIcons}></i></button>);
            if (this.state.newMessages !== 0) {
                bottomButtons.push(
                    <Badge key="chatBadge" badgeContent={this.state.newMessages} color="primary" classes={{ badge: this.props.classes.badge }} overlap="circular">
                        <button key="chatButton" type="button" title="Open Chat" className={commonButtonClasses} onClick={this.toggleChat}> <i className="fa fa-commenting-o"></i> </button>
                    </Badge>);
            } else {
                bottomButtons.push(
                    <button key="chatButton" type="button" title="Open Chat" className={commonButtonClasses} onClick={this.toggleChat}> <i className="fa fa-commenting-o"></i> </button>
                );
            }
        }
        bottomButtons.push(
            <label key="shareFiles" htmlFor="outlined-button-file">
                <IconButton title="Share files" component="span" disableRipple={true} className={shareButtonClasses}>
                    <i className={shareFileButtonIcons}></i>
                </IconButton>
            </label>
        );
        if (this.state.sharedFiles.length !== 0) {
            bottomButtons.push(
                <Badge
                    key="fileBadge"
                    badgeContent={this.state.sharedFiles.length}
                    color="primary"
                    classes={{ badge: this.props.classes.badge }}
                    anchorOrigin={{ horizontal: 'right', vertical: 'top' }}
                    overlap="circular"
                >
                    <button key="fbButton" type="button" title={!this.state.showFiles ? 'Show shared files' : 'Hide shared files'} className={commonButtonClasses} onClick={this.toggleFiles}>
                        <i className="fa fa-files-o"></i>
                    </button>
                </Badge>
            );
        }

        bottomButtons.push(<button key="hangupButton" type="button" title="Leave conference" className="btn btn-round btn-danger" onClick={this.hangup}> <i className="fa fa-phone rotate-135"></i> </button>);

        if (!chatLayout && !this.state.showChat) {
            buttons.bottom = bottomButtons;
        }

        if (!this.state.callOverlayVisible) {
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

        const participants = [];

        if (this.state.participants.length > 0) {
            if (this.state.activeSpeakers.findIndex((element) => { return element.id === this.props.call.id }) === -1) {
                participants.push(
                    <ConferenceParticipantSelf
                        key="myself"
                        stream={this.props.call.getLocalStreams()[0]}
                        identity={this.props.call.localIdentity}
                        audioMuted={this.state.audioMuted}
                        generatedVideoTrack={this.props.generatedVideoTrack}
                        audioOnly={chatLayout}
                    />
                );
            }
        }

        const onlyGuestsPresent = this.state.participants.filter((p) => {
            return p.identity.uri.endsWith(`@${config.defaultGuestDomain}`)
        }).length === this.state.participants.length;

        const disableHandToggle = !config.guestUserPermissions.allowToggleHandsParticipants && this.props.participantIsGuest && !onlyGuestsPresent;
        const drawerParticipants = [];
        drawerParticipants.push(
            <ConferenceDrawerParticipant
                key="myself"
                participant={{ identity: this.props.call.localIdentity, publisherId: this.props.call.id, streams: this.props.call.getLocalStreams() }}
                isLocal={true}
                raisedHand={this.state.raisedHands.findIndex((element) => { return element.id === this.props.call.id })}
                handleHandSelected={this.handleHandSelected}
                disableHandToggle={disableHandToggle}
                enableSpeakingIndication={chatLayout}
            />
        );

        let videos = [];

        if (this.state.participants.length === 0) {
            videos.push(
                <video ref="largeVideo" key="largeVideo" className={largeVideoClasses} poster="assets/images/transparent-1px.png" autoPlay muted />
            );
            if (this.props.call.getLocalStreams()[0].getVideoTracks().length === 0) {
                videos.push(<UserIcon key="icon" identity={this.props.call.localIdentity} large />)
            }
        } else {
            const activeSpeakers = this.state.activeSpeakers;
            const activeSpeakersCount = activeSpeakers.length;
            matrixClasses = clsx({
                'matrix': true,
                'one-row': activeSpeakersCount === 2,
                'two-columns': activeSpeakersCount === 2,
                'offset-carousel': activeSpeakersCount === 1 && this.state.participants.length >= 2
            });

            if (activeSpeakersCount > 0) {
                activeSpeakers.forEach((p) => {
                    let raisedHand = this.state.raisedHands.indexOf(p);
                    if (p.id === this.props.call.id && this.state.raisedHand) {
                        raisedHand = this.state.raisedHands.findIndex((elem) => elem.id === this.props.call.id);
                    }
                    videos.push(
                        <ConferenceMatrixParticipant
                            key={p.id}
                            participant={p}
                            large={activeSpeakersCount <= 1}
                            isLocal={p.id === this.props.call.id}
                            raisedHand={raisedHand}
                            handleHandSelected={this.handleHandSelected}
                            disableHandToggle={disableHandToggle}
                            pauseVideo={this.props.lowBandwidth}
                            stats={this.participantStats[p.id]}
                        />
                    );
                });

                this.state.participants.forEach((p) => {
                    if (this.state.activeSpeakers.indexOf(p) === -1) {
                        participants.push(
                            <ConferenceParticipant
                                key={p.id}
                                participant={p}
                                selected={this.onVideoSelected}
                                raisedHand={this.state.raisedHands.indexOf(p)}
                                handleHandSelected={this.handleHandSelected}
                                disableHandToggle={disableHandToggle}
                                pauseVideo={this.props.lowBandwidth}
                                stats={this.participantStats[p.id]}
                            />
                        );
                    }

                    drawerParticipants.push(
                        <ConferenceDrawerParticipant
                            key={p.id}
                            participant={p}
                            raisedHand={this.state.raisedHands.indexOf(p)}
                            handleHandSelected={this.handleHandSelected}
                            disableHandToggle={disableHandToggle}
                            enableSpeakingIndication={chatLayout}
                            stats={this.participantStats[p.id]}
                        />
                    );
                });
            } else {
                matrixClasses = clsx({
                    'matrix': true,
                    'one-row': this.state.participants.length === 2,
                    'two-row': this.state.participants.length >= 3 && this.state.participants.length < 7,
                    'three-row': this.state.participants.length >= 7,
                    'two-columns': this.state.participants.length >= 2 || this.state.participants.length <= 4,
                    'three-columns': this.state.participants.length > 4
                });
                this.state.participants.forEach((p) => {
                    videos.push(
                        <ConferenceMatrixParticipant
                            key={p.id}
                            participant={p}
                            large={this.state.participants.length <= 1}
                            raisedHand={this.state.raisedHands.indexOf(p)}
                            handleHandSelected={this.handleHandSelected}
                            disableHandToggle={disableHandToggle}
                            audioOnly={chatLayout}
                            pauseVideo={this.props.lowBandwidth}
                            stats={this.participantStats[p.id]}
                        />
                    );

                    drawerParticipants.push(
                        <ConferenceDrawerParticipant
                            key={p.id}
                            participant={p}
                            raisedHand={this.state.raisedHands.indexOf(p)}
                            handleHandSelected={this.handleHandSelected}
                            disableHandToggle={disableHandToggle}
                            enableSpeakingIndication={chatLayout}
                            stats={this.participantStats[p.id]}
                        />
                    );
                });
            }
        }
        const carouselClasses = clsx({
            'conference-thumbnails': true,
            'conference-thumbnails-small': this.state.participants.length === 1 && this.state.activeSpeakers.length <= 1
        });

        const callQuality = (
            <CallQuality
                videoData={this.state.videoGraphData}
                audioData={this.state.audioGraphData}
            />
        );

        return (
            <DragAndDrop handleDrop={this.handleDrop}>
                <MuteAudioParticipantsModal
                    show={this.state.showMuteAudioParticipantsModal}
                    close={this.toggleMuteAudioParticipantsModal}
                    handleMute={this.handleMuteAudioParticipants}
                />
                <ConferenceMenu
                    show={this.state.showMenu}
                    anchor={this.state.menuAnchor}
                    toggleShortcuts={this.props.toggleShortcuts}
                    toggleDevices={this.toggleSwitchModal}
                    close={this.toggleMenu}
                />
                <SwitchDevicesMenu
                    show={this.state.showSwitchMenu}
                    anchor={this.state.switchAnchor}
                    close={this.toggleSwitchMenu}
                    call={this.props.call}
                    setDevice={this.props.setDevice}
                />
                <SwitchDevicesMenu
                    show={this.state.showAudioSwitchMenu}
                    anchor={this.state.switchAnchor}
                    close={this.toggleAudioSwitchMenu}
                    call={this.props.call}
                    direction={chatLayout ? 'right' : ''}
                    setDevice={this.props.setDevice}
                    audio
                />
                <input
                    style={{ display: 'none' }}
                    id="outlined-button-file"
                    multiple
                    type="file"
                    onChange={this.handleFiles}
                />
                <div className={containerClasses} onMouseMove={this.showOverlay} onTouchEnd={this.showOverlay}>
                    <ConferenceHeader
                        show={this.state.callOverlayVisible}
                        remoteIdentity={remoteIdentity}
                        participants={this.state.participants}
                        buttons={buttons}
                        onTop={chatLayout || this.state.showChat}
                        transparent={!chatLayout && !this.state.showChat}
                        callQuality={callQuality}
                    />
                    <TransitionGroup>
                        {watermark}
                    </TransitionGroup>
                    <div className={matrixClasses}>
                        {videos}
                    </div>
                    <div className={carouselClasses} onMouseMove={this.preventOverlay}>
                        <ConferenceCarousel align={'right'}>
                            {participants}
                        </ConferenceCarousel>
                    </div>
                    <AudioPlayer ref="audioPlayerParticipantJoined" sourceFile="assets/sounds/participant_joined.wav" />
                    <AudioPlayer ref="audioPlayerParticipantLeft" sourceFile="assets/sounds/participant_left.wav" />
                    <InviteParticipantsModal
                        show={this.state.showInviteModal}
                        call={this.props.call}
                        close={this.toggleInviteModal}
                    />
                </div>
                <ConferenceDrawer
                    show={chatLayout && !this.state.showChat}
                    anchor="left"
                    size="small"
                    showClose={false}
                    close={() => { }}
                >
                    {bottomButtons}
                </ConferenceDrawer>
                <ConferenceDrawer
                    show={(this.state.showInlineChat || chatLayout || this.state.showFiles) && !this.state.showChat}
                    close={() => {
                        if (this.state.showInlineChat) {
                            this.toggleChat();
                        }
                        if (this.state.showFiles) {
                            this.toggleFiles();
                        }
                    }}
                    anchor={(!chatLayout) ? 'right' : 'left'}
                    transparent={false}
                    size={(!chatLayout) ? (utils.isMobile.any() ? 'normal' : 'wide') : 'full'}
                    {...chatLayout && { position: this.state.showDrawer || this.state.showFiles ? 'middle' : 'right' }}
                    showClose={!chatLayout}
                    {...this.state.isComposing && !chatLayout && { title: (<i className="fa fa-ellipsis-h fa-2x" />) }}
                >
                    {this.state.showFiles && !chatLayout &&
                        <ConferenceDrawerFiles
                            sharedFiles={this.state.sharedFiles}
                            downloadFile={this.downloadFile}
                            wide
                            embed
                        />
                    }
                    {this.state.showFiles && !chatLayout && this.state.showInlineChat &&
                        <h4 className="header">
                            Conference Chat
                            {this.state.isComposing &&
                                <span>
                                    <i className="fa fa-ellipsis-h fa-2x" />
                                </span>
                            }
                        </h4>
                    }
                    {(this.state.showInlineChat || chatLayout) && [
                        <ConferenceChat messages={this.state.messages} scroll={this.state.shouldScroll} />,
                        <ConferenceChatEditor onSubmit={this.handleSend} onTyping={this.handleTyping} scroll={this.setScroll} focus={this.toggleChatEditorFocus} />
                    ]}
                </ConferenceDrawer>
                <ConferenceDrawer show={this.state.showDrawer && !this.state.showChat} close={this.toggleDrawer}>
                    {!chatLayout &&
                        <ConferenceDrawerSpeakerSelection
                            participants={this.state.participants.concat(
                                [{
                                    id: this.props.call.id,
                                    publisherId: this.props.call.id,
                                    identity: this.props.call.localIdentity
                                }]
                            )}
                            selected={this.handleActiveSpeakerSelected}
                            activeSpeakers={this.state.activeSpeakers}
                        />
                    }
                    {onlyGuestsPresent || !this.props.participantIsGuest || config.guestUserPermissions.allowMuteAllParticipants ?
                        <ConferenceDrawerMute
                            muteEverybody={this.toggleMuteAudioParticipantsModal}
                        /> : ''
                    }
                    <ConferenceDrawerParticipantList>
                        {drawerParticipants}
                    </ConferenceDrawerParticipantList>
                    {!chatLayout &&
                        <ConferenceDrawerLog log={this.state.eventLog} />
                    }
                </ConferenceDrawer>
                <ConferenceDrawer show={this.state.showFiles && !this.state.showChat && chatLayout} close={this.toggleFiles}>
                    <ConferenceDrawerFiles
                        sharedFiles={this.state.sharedFiles}
                        downloadFile={this.downloadFile}
                    />
                </ConferenceDrawer>
                <ConferenceDrawer
                    show={this.state.showStatistics}
                    anchor="left"
                    showClose={true}
                    close={this.toggleStatistics}
                    transparent={true}
                    {...chatLayout && { onTop: true }}
                >
                    <Statistics
                        videoData={this.state.videoGraphData}
                        audioData={this.state.audioGraphData}
                        lastData={this.state.lastData}
                        videoElements={{ remoteVideo: this.remoteVideo, localVideo: this.localVideo }}
                        {...!chatLayout && { video: true }}
                    />
                </ConferenceDrawer>
                <SwitchDevicesModal
                    show={this.state.showSwitchModal}
                    close={this.toggleSwitchModal}
                    call={this.props.call}
                    disableCameraSelection={chatLayout}
                    setDevice={this.props.setDevice}
                />
            </DragAndDrop>
        );
    }
}

ConferenceBox.propTypes = {
    notificationCenter: PropTypes.func.isRequired,
    setDevice: PropTypes.func.isRequired,
    shareScreen: PropTypes.func.isRequired,
    classes: PropTypes.object.isRequired,
    propagateKeyPress: PropTypes.func.isRequired,
    toggleShortcuts: PropTypes.func.isRequired,
    call: PropTypes.object,
    hangup: PropTypes.func,
    remoteIdentity: PropTypes.string,
    generatedVideoTrack: PropTypes.bool,
    participantIsGuest: PropTypes.bool,
    lowBandwidth: PropTypes.bool,
    toggleChatInCall: PropTypes.func,
    unreadMessages: PropTypes.object
};

ReactMixin(ConferenceBox.prototype, FullscreenMixin);


module.exports = withStyles(styleSheet)(ConferenceBox);
