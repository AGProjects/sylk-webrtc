'use strict';

const React                     = require('react');
const ReactDOM                  = require('react-dom');
const Router                    = require('react-router-component');
const Locations                 = Router.Locations;
const Location                  = Router.Location;
const NotFound                  = Router.NotFound;
const TransitionGroup           = require('react-transition-group/TransitionGroup');
const CSSTransition             = require('react-transition-group/CSSTransition');
const adapter                   = require('webrtc-adapter');
const sylkrtc                   = require('sylkrtc');
const debug                     = require('debug');
const DigestAuthRequest         = require('digest-auth-request');

const RegisterBox          = require('./components/RegisterBox');
const ReadyBox             = require('./components/ReadyBox');
const Call                 = require('./components/Call');
const CallByUriBox         = require('./components/CallByUriBox');
const Conference           = require('./components/Conference');
const ConferenceByUriBox   = require('./components/ConferenceByUriBox');
const AudioPlayer          = require('./components/AudioPlayer');
const ErrorPanel           = require('./components/ErrorPanel');
const FooterBox            = require('./components/FooterBox');
const StatusBox            = require('./components/StatusBox');
const IncomingCallModal    = require('./components/IncomingCallModal');
const IncomingCallWindow   = require('./components/IncomingCallWindow');
const NotificationCenter   = require('./components/NotificationCenter');
const LoadingScreen        = require('./components/LoadingScreen');
const NavigationBar        = require('./components/NavigationBar');
const Preview              = require('./components/Preview');
const ScreenSharingModal   = require('./components/ScreenSharingModal');
const ShortcutsModal       = require('./components/ShortcutsModal');

const utils     = require('./utils');
const config    = require('./config');
const storage   = require('./storage');
const history   = require('./history');

// attach debugger to the window for console access
window.blinkDebugger = debug;

const DEBUG = debug('blinkrtc:App');

// Application modes
const MODE_NORMAL           = Symbol('mode-normal');
const MODE_PRIVATE          = Symbol('mode-private');
const MODE_GUEST_CALL       = Symbol('mode-guest-call');
const MODE_GUEST_CONFERENCE = Symbol('mode-guest-conference');


class Blink extends React.Component {
    constructor() {
        super();
        this._initialSstate = {
            accountId: '',
            password: '',
            displayName: '',
            account: null,
            registrationState: null,
            currentCall: null,
            connection: null,
            inboundCall: null,
            showIncomingModal: false,
            showScreenSharingModal: false,
            showShortcutsModal: false,
            status: null,
            targetUri: '',
            missedTargetUri: '',
            loading: null,
            mode: MODE_PRIVATE,
            localMedia: null,
            generatedVideoTrack: false,
            history: [],
            serverHistory: [],
            devices: {},
            propagateKeyPress: false
        };
        this.state = Object.assign({}, this._initialSstate);

        this.__notificationCenter = null;

        // ES6 classes no longer autobind
        [
            'connect',
            'connectionStateChanged',
            'registrationStateChanged',
            'callStateChanged',
            'inboundCallStateChanged',
            'hasFocus',
            'hasNoFocus',
            'setFocusEvents',
            'handleCallByUri',
            'handleConferenceByUri',
            'handleRegistration',
            'startCall',
            'startConference',
            'answerCall',
            'rejectCall',
            'hangupCall',
            'outgoingCall',
            'incomingCall',
            'missedCall',
            'toggleMute',
            'conferenceInvite',
            'notificationCenter',
            'escalateToConference',
            'setDevice',
            'login',
            'logout',
            'ready',
            'call',
            'callByUri',
            'conference',
            'conferenceByUri',
            'notSupported',
            'checkRoute',
            'startPreview',
            'preview',
            'main',
            'switchScreensharing',
            'toggleScreenSharingModal',
            'toggleShortcutsModal',
            'togglePropagateKeyPress',
            'getLocalScreen',
            'getServerHistory'
        ].forEach((name) => {
            this[name] = this[name].bind(this);
        });
        this.participantsToInvite = null;
        this.redirectTo = null;
        this.prevPath = null;
        this.shouldUseHashRouting = false;
        this.muteIncoming = false;
    }

    get _notificationCenter() {
        // getter to lazy-load the NotificationCenter ref
        if (!this.__notificationCenter) {
            this.__notificationCenter = this.refs.notificationCenter;
        }
        return this.__notificationCenter;
    }

    componentWillMount() {
        storage.initialize();

        if (window.location.hash.startsWith('#!/')) {
            this.redirectTo = window.location.hash.replace('#!', '');
        } else {
            // Disallowed routes, they will rendirect to /login
            const disallowedRoutes = new Set(['/', '/ready','/call','/preview']);

            if (disallowedRoutes.has(window.location.pathname)) {
                this.redirectTo = '/login';
            }

            if (/^\/conference\/?$/g.test(window.location.pathname)) {
                this.redirectTo = `/conference/${utils.generateSillyName()}`;
            }

        }

        // Check if we should use hash routing
        if (typeof window.process !== 'undefined') {
            if (window.process.versions.electron !== '') {
                this.shouldUseHashRouting = true;
            }
        }
        history.load().then((entries) => {
            if (entries) {
                this.setState({history: entries});
            }
        });

        // Load camera/mic preferences
        storage.get('devices').then((devices) => {
            if (devices) {
                this.setState({devices: devices});
            }
        });
    }

    componentDidMount() {
        if (!window.RTCPeerConnection) {
            setTimeout(() => {
                this.refs.router.navigate('/not-supported');
            });
        }

        if (this.shouldUseHashRouting) {
            setTimeout(() => {
                this.refs.router.navigate('/login');
            });
        }
        // prime the ref
        DEBUG('NotificationCenter ref: %o', this._notificationCenter);
        document.addEventListener('keydown', (event) => {
            if (!this.state.propagateKeyPress) {
                switch (event.key) {
                    case '?':
                        event.preventDefault();
                        this.toggleShortcutsModal();
                        break;
                    default:
                        break;
                }
            }
        });
    }

    connectionStateChanged(oldState, newState) {
        DEBUG(`Connection state changed! ${oldState} -> ${newState}`);
        switch (newState) {
            case 'closed':
                this.setState({connection: null, loading: null});
                break;
            case 'ready':
                this.processRegistration(this.state.accountId, this.state.password, this.state.displayName);
                break;
            case 'disconnected':
                this.refs.audioPlayerOutbound.stop();
                this.refs.audioPlayerInbound.stop();

                if (this.state.localMedia) {
                    sylkrtc.utils.closeMediaStream(this.state.localMedia);
                }

                if (this.state.currentCall) {
                    this.state.currentCall.removeListener('stateChanged', this.callStateChanged);
                    this.state.currentCall.terminate();
                }

                if (this.state.inboundCall && this.state.inboundCall !== this.state.currentCall) {
                    this.state.inboundCall.removeListener('stateChanged', this.inboundCallStateChanged);
                    this.state.inboundCall.terminate();
                }

                this.setState({
                    account:null,
                    registrationState: null,
                    loading: 'Disconnected, reconnecting...',
                    showIncomingModal: false,
                    currentCall: null,
                    inboundCall: null,
                    localMedia: null,
                    generatedVideoTrack: false,
                    serverHistory: []
                });
                break;
            default:
                this.setState({loading: 'Connecting...'});
                break;
        }
    }

    notificationCenter() {
        return this._notificationCenter;
    }

    registrationStateChanged(oldState, newState, data) {
        DEBUG('Registration state changed! ' + newState);
        this.setState({registrationState: newState});
        if (newState === 'failed') {
            let reason = data.reason;
            if (reason.match(/904/)) {
                // Sofia SIP: WAT
                reason = 'Bad account or password';
            } else {
                reason = 'Connection failed';
            }
            this.setState({
                loading     : null,
                status      : {
                    msg   : 'Sign In failed: ' + reason,
                    level : 'danger'
                }
            });
        } else if (newState === 'registered') {
            this.setState({loading: null});
            this.refs.router.navigate('/ready');
            return;
        } else {
            this.setState({status: null });
        }
    }

    callStateChanged(oldState, newState, data) {
        DEBUG(`Call state changed! ${oldState} -> ${newState}`);

        switch (newState) {
            case 'progress':
                this.refs.audioPlayerOutbound.play(true);
                break;
            case 'accepted':
                this.refs.audioPlayerOutbound.stop();
                this.refs.audioPlayerInbound.stop();
                break;
            case 'terminated':
                this.refs.audioPlayerOutbound.stop();
                this.refs.audioPlayerInbound.stop();
                this.refs.audioPlayerHangup.play();

                let callSuccesfull = false;
                let reason = data.reason;
                if (!reason || reason.match(/200/)) {
                    reason = 'Hangup';
                    callSuccesfull = true;
                } else if (reason.match(/403/)) {
                    reason = 'This domain is not served here';
                } else if (reason.match(/404/)) {
                    reason = 'User not found';
                } else if (reason.match(/408/)) {
                    reason = 'Timeout';
                } else if (reason.match(/480/)) {
                    reason = 'User not online';
                } else if (reason.match(/486/) || reason.match(/60[036]/)) {
                    reason = 'Busy';
                } else if (reason.match(/487/)) {
                    reason = 'Cancelled';
                } else if (reason.match(/488/)) {
                    reason = 'Unacceptable media';
                } else if (reason.match(/5\d\d/)) {
                    reason = 'Server failure';
                } else if (reason.match(/904/)) {
                    // Sofia SIP: WAT
                    reason = 'Bad account or password';
                } else {
                    reason = 'Connection failed';
                }
                this._notificationCenter.postSystemNotification('Call Terminated', {body: reason, timeout: callSuccesfull ? 5 : 10});

                this.setState({
                    currentCall         : null,
                    targetUri           : callSuccesfull || config.useServerCallHistory ? '' : this.state.targetUri,
                    showIncomingModal   : false,
                    inboundCall         : null,
                    localMedia          : null,
                    generatedVideoTrack : false
                });
                this.setFocusEvents(false);
                this.participantsToInvite = null;

                this.refs.router.navigate('/ready');

                break;
            default:
                break;
        }
    }

    inboundCallStateChanged(oldState, newState, data) {
        DEBUG('Inbound Call state changed! ' + newState);
        if (newState === 'terminated') {
            this.setState({ inboundCall: null, showIncomingModal: false });
            this.setFocusEvents(false);
        }
    }

    connect() {
        const connection = sylkrtc.createConnection({
            server: config.wsServer,
            userAgent: {
                name: `Sylk${this.shouldUseHashRouting ? 'App' : 'Web'}`,
                version: process.env.PACKAGE_VERSION
            }
        });
        connection.on('stateChanged', this.connectionStateChanged);
        this.setState({connection: connection});
    }

    handleCallByUri(displayName, targetUri) {
        const accountId = `${utils.generateUniqueId()}@${config.defaultGuestDomain}`;
        this.setState({
            accountId      : accountId,
            password       : '',
            displayName    : displayName,
            mode           : MODE_GUEST_CALL,
            targetUri      : utils.normalizeUri(targetUri, config.defaultDomain),
            loading        : 'Connecting...'
        });

        if (this.state.connection === null) {
            this.connect();
        } else {
            DEBUG('Connection Present, try to register');
            this.processRegistration(accountId, '', displayName);
        }
    }

    handleConferenceByUri(displayName, targetUri) {
        const accountId = `${utils.generateUniqueId()}@${config.defaultGuestDomain}`;
        this.setState({
            accountId      : accountId,
            password       : '',
            displayName    : displayName,
            mode           : MODE_GUEST_CONFERENCE,
            targetUri      : targetUri,
            loading        : 'Connecting...'
        });

        if (this.state.connection === null) {
            this.connect();
        } else {
            DEBUG('Connection Present, try to register');
            this.processRegistration(accountId, '', displayName);
        }
    }

    handleRegistration(accountId, password, remember) {
        // Needed for ready event in connection
        remember = this.shouldUseHashRouting ? true : remember;
        this.setState({
            accountId : accountId,
            password  : password,
            mode      : remember ? MODE_NORMAL : MODE_PRIVATE,
            loading   : 'Connecting...'
        });

        if (this.state.connection === null) {
            this.connect();
        } else {
            DEBUG('Connection Present, try to register');
            this.processRegistration(accountId, password, '');
        }
    }

    processRegistration(accountId, password, displayName) {
        if (this.state.account !== null) {
            DEBUG('We already have an account, removing it');
            this.state.connection.removeAccount(this.state.account,
                (error) => {
                    if (error) {
                        DEBUG(error);
                    }
                    this.setState({account: null, registrationState: null});
                }
            );
            this.setState({serverHistory: []});
        }

        const options = {
            account: accountId,
            password: password,
            displayName: displayName
        };
        const account = this.state.connection.addAccount(options, (error, account) => {
            if (!error) {
                account.on('outgoingCall', this.outgoingCall);
                account.on('conferenceCall', this.outgoingCall);
                switch (this.state.mode) {
                    case MODE_PRIVATE:
                    case MODE_NORMAL:
                        account.on('registrationStateChanged', this.registrationStateChanged);
                        account.on('incomingCall', this.incomingCall);
                        account.on('missedCall', this.missedCall);
                        account.on('conferenceInvite', this.conferenceInvite);
                        this.setState({account: account});
                        this.state.account.register();
                        if (this.state.mode !== MODE_PRIVATE) {
                            if (this.shouldUseHashRouting) {
                                storage.set('account', {accountId: this.state.accountId, password: this.state.password});
                            } else {
                                storage.get('account').then((account) => {
                                    if (account && account.accountId !== this.state.accountId) {
                                        history.clear().then(() => {
                                            this.setState({history: []});
                                        });
                                    }
                                });
                                storage.set('account', {accountId: this.state.accountId, password: ''});
                            }
                        } else {
                            // Wipe storage if private login
                            storage.remove('account');
                            history.clear().then(() => {
                                this.setState({history: []});
                            });
                        }
                        break;
                    case MODE_GUEST_CALL:
                        this.setState({account: account, loading: null, registrationState: 'registered'});
                        DEBUG(`${accountId} (guest) signed in`);
                        // Start the call immediately, this is call started with "Call by URI"
                        this.startGuestCall(this.state.targetUri, {audio: true, video: true});
                        break;
                    case MODE_GUEST_CONFERENCE:
                        this.setState({account: account, loading: null, registrationState: 'registered'});
                        DEBUG(`${accountId} (conference guest) signed in`);
                        // Start the call immediately, this is call started with "Conference by URI"
                        this.startGuestConference(this.state.targetUri);
                        break;
                    default:
                        DEBUG(`Unknown mode: ${this.state.mode}`);
                        break;

                }
            } else {
                DEBUG('Add account error: ' + error);
                this.setState({loading: null, status: {msg: error.message, level:'danger'}});
            }
        });
    }

    setDevice(device) {
        const oldDevices = Object.assign({}, this.state.devices);

        if (device.kind === 'videoinput') {
            oldDevices['camera'] = device;
        } else if (device.kind === 'audioinput') {
            oldDevices['mic'] = device;
        }

        this.setState({devices: oldDevices});
        storage.set('devices', oldDevices);
        sylkrtc.utils.closeMediaStream(this.state.localMedia);
        this.getLocalMedia();
    }

    getLocalScreen(source) {
        let screenConstraints = {
            video: {
                mozMediaSource: 'window',
                mediaSource: 'window'
            }
        };

        if (this.shouldUseHashRouting) {
            screenConstraints = {
                audio: false,
                video: {
                    mandatory : {
                        chromeMediaSource: 'desktop',
                        chromeMediaSourceId: source
                    }
                }
            };
            DEBUG('This is electron, modifying constraints %o', screenConstraints);
            this.toggleScreenSharingModal();
        }

        if (!this.shouldUseHashRouting && navigator.getDisplayMedia) {
            navigator.getDisplayMedia({
                video: true
            }).then(screenStream => {
                this.state.currentCall.startScreensharing(screenStream.getVideoTracks()[0]);
                screenStream.getVideoTracks()[0].addEventListener('ended', (ev) => {
                    DEBUG('Screensharing stream ended by user action');
                    this.switchScreensharing();
                });
            }).catch((error) => {
                DEBUG('Error getting screen %o', error);
            });
        } else if (!this.shouldUseHashRouting && navigator.mediaDevices.getDisplayMedia) {
            navigator.mediaDevices.getDisplayMedia({
                video: true
            }).then(screenStream => {
                this.state.currentCall.startScreensharing(screenStream.getVideoTracks()[0]);
                screenStream.getVideoTracks()[0].addEventListener('ended', (ev) => {
                    DEBUG('Screensharing stream ended by user action');
                    this.switchScreensharing();
                });
            }).catch((error) => {
                DEBUG('Error getting screen %o', error);
            });
        } else {
            DEBUG('Modern Screensharing API not available using getUserMedia');
            navigator.mediaDevices.getUserMedia(screenConstraints)
            .then((screenStream) => {
                this.state.currentCall.startScreensharing(screenStream.getVideoTracks()[0]);
                screenStream.getVideoTracks()[0].addEventListener('ended', (ev) => {
                    DEBUG('Screensharing stream ended by user action');
                    this.switchScreensharing();
                });
            }).catch((error) => {
                DEBUG('Error getting screen %o', error);
            });
        }
    }

    getLocalMedia(mediaConstraints={audio: true, video: true}, nextRoute=null) {    // eslint-disable-line space-infix-ops
        DEBUG('getLocalMedia(), mediaConstraints=%o', mediaConstraints);
        const constraints = Object.assign({}, mediaConstraints);

        const isSafari = navigator.vendor && navigator.vendor.indexOf('Apple') > -1 &&
        navigator.userAgent &&
        navigator.userAgent.indexOf('CriOS') == -1 &&
        navigator.userAgent.indexOf('FxiOS') == -1;

        if (constraints.video === true) {
            if ((nextRoute === '/conference' ||  this.state.mode === MODE_GUEST_CONFERENCE) && navigator.userAgent.indexOf('Firefox') > 0) {
                constraints.video = {
                    'width': {
                        'ideal': 640
                    },
                    'height': {
                        'ideal': 480
                    }
                };

            // TODO: remove this, workaround so at least safari works wehn joining a video conference
            } else if ((nextRoute === '/conference' ||  this.state.mode === MODE_GUEST_CONFERENCE) && isSafari) {
                constraints.video = false;
            } else {
                // ask for 720p video
                constraints.video = {
                    'width': {
                        'ideal': 1280
                    },
                    'height': {
                        'ideal': 720
                    }
                };
            }
        }

        DEBUG('getLocalMedia(), (modified) mediaConstraints=%o', constraints);

        this.loadScreenTimer = setTimeout(() => {
            this.setState({loading: 'Please allow access to your media devices'});
        }, 150);


        new Promise((resolve, reject) => {
            if (isSafari) {
                return navigator.mediaDevices.getUserMedia(constraints)
                .then((stream) => {
                    sylkrtc.utils.closeMediaStream(stream);
                    resolve();
                }).catch((error) => {
                    DEBUG('Intial access failed: %o', error);
                    resolve();
                });
            }
            resolve();
        })
        .then(() => {
            return navigator.mediaDevices.enumerateDevices();
        })
        .then((devices) => {
            devices.forEach((device) => {
                if ('video' in constraints && 'camera' in this.state.devices) {
                    if (constraints.video !== false && (device.deviceId === this.state.devices.camera.deviceId || device.label === this.state.devices.camera.label)) {
                        constraints.video.deviceId = {
                            exact: device.deviceId
                        };
                    }
                }
                if ('mic' in this.state.devices) {
                    if (device.deviceId === this.state.devices.mic.deviceId || device.label === this.state.devices.mic.Label) {
                        constraints.audio = {
                            deviceId: {
                                exact: device.deviceId
                            }
                        };
                    }
                }
            });
        })
        .catch((error) => {
            DEBUG('Device enumeration failed: %o', error);
        })
        .then(() => {
            return navigator.mediaDevices.getUserMedia(constraints)
        })
        .then((localStream) => {
            clearTimeout(this.loadScreenTimer);
            this.setState({status: null, loading: null, localMedia: localStream});
            if (nextRoute !== null) {
                this.refs.router.navigate(nextRoute);
            }
        })
        .catch((error) => {
            DEBUG('Access failed, trying audio only: %o', error);
            navigator.mediaDevices.getUserMedia({
                audio: true,
                video: false
            })
            .then((localStream) => {
                clearTimeout(this.loadScreenTimer);

                if (nextRoute != '/preview') {
                    DEBUG('Audio only media, but video was requested, creating generated video track');
                    const generatedVideoTrack = utils.generateVideoTrack(localStream);
                    localStream.addTrack(generatedVideoTrack);
                }

                this.setState({status: null, loading: null, localMedia: localStream, generatedVideoTrack: true});
                if (nextRoute !== null) {
                    this.refs.router.navigate(nextRoute);
                }
            })
            .catch((error) => {
                DEBUG('Access to local media failed: %o', error);
                clearTimeout(this.loadScreenTimer);
                this._notificationCenter.postSystemNotification("Can't access camera or microphone", {timeout: 10});
                this.setState({
                    loading: null
                });
            });
        });
    }

    startCall(targetUri, options) {
        this.setState({targetUri: targetUri});
        this.addCallHistoryEntry(targetUri);
        this.getLocalMedia(Object.assign({audio: true, video: true}, options), '/call');
    }

    startGuestCall(targetUri, options) {
        this.setState({targetUri: targetUri});
        this.getLocalMedia(Object.assign({audio: true, video: true}, options));
    }

    switchScreensharing() {
        if (!this.state.currentCall.sharingScreen) {
            if (this.shouldUseHashRouting) {
                this.toggleScreenSharingModal();
            } else {
                this.getLocalScreen();
            }
        } else {
            this.state.currentCall.stopScreensharing();
        }
    }

    toggleScreenSharingModal() {
        this.setState({
            showScreenSharingModal : !this.state.showScreenSharingModal
        });
    }

    toggleShortcutsModal() {
        this.setState({
            showShortcutsModal : !this.state.showShortcutsModal
        });
    }

    togglePropagateKeyPress() {
        this.setState({
            propagateKeyPress : !this.state.propagateKeyPress
        });
    }

    answerCall(options) {
        this.setState({ showIncomingModal: false });
        this.setFocusEvents(false);
        if (this.state.inboundCall !== this.state.currentCall) {
            // terminate current call to switch to incoming one
            this.state.inboundCall.removeListener('stateChanged', this.inboundCallStateChanged);
            this.state.currentCall.removeListener('stateChanged', this.callStateChanged);
            this.state.currentCall.terminate();
            this.setState({currentCall: this.state.inboundCall, inboundCall: this.state.inboundCall, localMedia: null});
            this.state.inboundCall.on('stateChanged', this.callStateChanged);
        }
        this.getLocalMedia(Object.assign({audio: true, video: true}, options), '/call');
    }

    rejectCall() {
        this.setState({showIncomingModal: false});
        this.state.inboundCall.terminate();
    }

    hangupCall() {
        if (this.state.currentCall != null) {
            this.state.currentCall.terminate();
        } else {
            // We have no call but we still want to cancel
            if (this.state.localMedia != null) {
                sylkrtc.utils.closeMediaStream(this.state.localMedia);
            }
            this.refs.router.navigate('/ready');
        }
    }

    escalateToConference(participants) {
        this.state.currentCall.removeListener('stateChanged', this.callStateChanged);
        this.state.currentCall.terminate();
        this.refs.router.navigate('/ready');
        this.setState({currentCall: null, localMedia: null});
        this.participantsToInvite = participants;
        const uri = `${utils.generateSillyName()}@${config.defaultConferenceDomain}`;
        this.startConference(uri);
    }

    startConference(targetUri) {
        this.setState({targetUri: targetUri});
        this.getLocalMedia({audio: true, video: true}, '/conference');
    }

    startGuestConference(targetUri) {
        this.setState({targetUri: targetUri});
        this.getLocalMedia({audio: true, video: true});
    }

    toggleMute() {
        this.muteIncoming = !this.muteIncoming;
    }

    outgoingCall(call) {
        call.on('stateChanged', this.callStateChanged);
        this.setState({currentCall: call});
    }

    incomingCall(call, mediaTypes) {
        DEBUG('New incoming call from %o with %o', call.remoteIdentity, mediaTypes);
        if (!mediaTypes.audio && !mediaTypes.video) {
            call.terminate();
            return;
        }
        call.mediaTypes = mediaTypes;
        if (this.state.currentCall !== null) {
            // detect if we called ourselves
            if (this.state.currentCall.localIdentity.uri === call.remoteIdentity.uri) {
                DEBUG('Aborting call to myself');
                call.terminate();
                return;
            }
            this.setState({ showIncomingModal: true, inboundCall: call });
            this.setFocusEvents(true);
            call.on('stateChanged', this.inboundCallStateChanged);
        } else {
            if (!this.muteIncoming) {
                this.refs.audioPlayerInbound.play(true);
            }
            this.setFocusEvents(true);
            call.on('stateChanged', this.callStateChanged);
            this.setState({currentCall: call, inboundCall: call, showIncomingModal: true});
        }
        if (!this.shouldUseHashRouting) {
            this._notificationCenter.postSystemNotification('Incoming call', {body: `From ${call.remoteIdentity.displayName || call.remoteIdentity.uri}`, timeout: 15, silent: false});
        }
    }

    setFocusEvents(enabled) {
        if (this.shouldUseHashRouting) {
            const remote = window.require('electron').remote;
            if (enabled) {
                const currentWindow = remote.getCurrentWindow();
                currentWindow.on('focus', this.hasFocus);
                currentWindow.on('blur', this.hasNoFocus);
                this.setState({haveFocus: currentWindow.isFocused()});
            } else {
                const currentWindow = remote.getCurrentWindow();
                currentWindow.removeListener('focus', this.hasFocus);
                currentWindow.removeListener('blur', this.hasNoFocus);
            }
        }
    }

    hasFocus() {
        this.setState({haveFocus: true});
    }

    hasNoFocus() {
        this.setState({haveFocus: false});
    }

    missedCall(data) {
        DEBUG('Missed call from ' + data.originator);
        this._notificationCenter.postSystemNotification('Missed call', {body: `From ${data.originator.displayName || data.originator.uri}`, timeout: 15, silent: false});
        if (this.state.currentCall !== null || !config.useServerCallHistory) {
            this._notificationCenter.postMissedCall(data.originator, () => {
                if (this.state.currentCall !== null) {
                    this.state.currentCall.removeListener('stateChanged', this.callStateChanged);
                    this.state.currentCall.terminate();
                    this.setState({currentCall: null, missedTargetUri: data.originator.uri, showIncomingModal: false, localMedia: null});
                } else {
                    this.setState({missedTargetUri: data.originator.uri});
                }
                this.refs.router.navigate('/ready');
            });
        } else {
            this.getServerHistory();
        }
    }

    conferenceInvite(data) {
        DEBUG('Conference invite from %o to %s', data.originator, data.room);
        this._notificationCenter.postSystemNotification('Conference invite', {body: `From ${data.originator.displayName || data.originator.uri} for room ${data.room}`, timeout: 15, silent: false});
        this._notificationCenter.postConferenceInvite(data.originator, data.room, () => {
            if (this.state.currentCall !== null) {
                this.state.currentCall.removeListener('stateChanged', this.callStateChanged);
                this.state.currentCall.terminate();
                this.setState({currentCall: null, showIncomingModal: false, localMedia: null, generatedVideoTrack: false});
            }
            setTimeout(() => {
                this.startConference(data.room);
            });
        });
    }

    startPreview() {
        this.getLocalMedia({audio: true, video: true}, '/preview');
    }

    addCallHistoryEntry(uri) {
        if (this.state.mode === MODE_NORMAL) {
            history.add(uri).then((entries) => {
                this.setState({history: entries});
            });
        } else {
            let entries = this.state.history.slice();
            if (entries.length !== 0) {
                const idx = entries.indexOf(uri);
                if (idx !== -1) {
                    entries.splice(idx, 1);
                }
                entries.unshift(uri);
                // keep just the last 50
                entries = entries.slice(0, 50);
            } else {
                entries = [uri];
            }
            this.setState({history: entries});
        }
    }

    getServerHistory() {
        if (!config.useServerCallHistory) {
            return;
        }

        DEBUG('Requesting call history from server');
        let getServerCallHistory = new DigestAuthRequest(
            'GET',
            `${config.serverCallHistoryUrl}?action=get_history&realm=${this.state.account.id.split('@')[1]}`,
            this.state.account.id.split('@')[0],
            this.state.password
        );
        // Disable logging
        getServerCallHistory.loggingOn = false;
        getServerCallHistory.request((data) => {
            if (data.success !== undefined && data.success === false) {
                DEBUG('Error getting call history from server: %o', data.error_message)
                return;
            }
            let history = []
            data.placed.map(elem => {elem.direction = 'placed'; return elem});
            data.received.map(elem => {elem.direction = 'received'; return elem});
            history = data.placed;
            history = history.concat(data.received);
            history.sort((a,b) => {
                return new Date(b.startTime) - new Date(a.startTime);
            });
            const known = [];
            history = history.filter((elem) => {
                if (known.indexOf(elem.remoteParty) <= -1) {
                    if ((elem.media.indexOf('audio') > -1 || elem.media.indexOf('video') > -1) &&
                        (elem.remoteParty !== this.state.account.id || elem.direction !== 'placed')) {
                            known.push(elem.remoteParty);
                            return elem;
                    }
                }
            });
            this.setState({serverHistory: history});
        }, (errorCode) => {
            DEBUG('Error getting call history from server: %o', errorCode)
        });
    }

    checkRoute(nextPath, navigation, match) {
        if (nextPath !== this.prevPath) {
            DEBUG(`Transition from ${this.prevPath} to ${nextPath}`);

            // Don't navigate if the app is not supported
            if (!window.RTCPeerConnection && nextPath !== '/not-supported') {
                this.refs.router.navigate('/not-supported');
                this.forceUpdate();
                return false;
            }

            if (config.useServerCallHistory && nextPath === '/ready' && this.state.registrationState === 'registered' && (this.state.mode !== MODE_GUEST_CALL && this.state.mode !== MODE_GUEST_CONFERENCE)) {
                this.getServerHistory();
            }
            // Press back in ready after a login, prevent initial navigation
            // don't deny if there is no registrationState (connection fail)
            if (this.prevPath === '/ready' && nextPath === '/login' && this.state.registrationState !== null) {
                DEBUG('Transition denied redirecting to /logout');
                this.refs.router.navigate('/logout');
                return false;

            // Press back in ready after a call
            } else if ((nextPath === '/call' || nextPath === '/conference') && this.state.localMedia === null && this.state.registrationState === 'registered') {
                return false;

            // Press back from within a call/conference, don't navigate terminate the call and
            // let termination take care of navigating
            } else if (nextPath === '/ready' && this.state.registrationState === 'registered' && this.state.currentCall !== null) {
                this.state.currentCall.terminate();
                return false;

            // Guest call ended, needed to logout and display msg and logout
            } else if (nextPath === '/ready' && (this.state.mode === MODE_GUEST_CALL || this.state.mode === MODE_GUEST_CONFERENCE)) {
                this.refs.router.navigate('/logout');
                this.forceUpdate();
            }
        }
        this.prevPath = nextPath;
    }

    render() {
        if (this.redirectTo !== null) {
            window.location.href = this.redirectTo;
            return false;
        }

        let loadingScreen;
        let incomingCallModal;
        let incomingWindow;
        let screenSharingModal;
        let footerBox = <FooterBox />;

        if (this.state.loading !== null) {
            loadingScreen = <LoadingScreen text={this.state.loading} />;
        }
        if (this.state.showIncomingModal) {
            incomingCallModal = (
                <CSSTransition
                    key="incoming"
                    classNames="incoming-modal"
                    timeout= {{enter:300, exit:300}}
                >
                    <IncomingCallModal
                        call = {this.state.inboundCall}
                        onAnswer = {this.answerCall}
                        onHangup = {this.rejectCall}
                    />
                </CSSTransition>
            );
            if (this.shouldUseHashRouting) {
                incomingWindow = (
                    <IncomingCallWindow
                        enabled  = {!this.state.haveFocus}
                        onAnswer = {this.answerCall}
                        onHangup = {this.rejectCall}
                        setFocus = {this.setFocusEvents}
                    >
                        <IncomingCallModal
                            call = {this.state.inboundCall}
                            onAnswer = {this.answerCall}
                            onHangup = {this.rejectCall}
                            compact = {true}
                        />
                    </IncomingCallWindow>
                );
            }
        }

        if (this.shouldUseHashRouting) {
            screenSharingModal = (
                <ScreenSharingModal
                    show = {this.state.showScreenSharingModal}
                    close= {this.toggleScreenSharingModal}
                    getLocalScreen = {this.getLocalScreen}
                />
            );
        }

        if (this.state.localMedia || this.state.registrationState === 'registered') {
            footerBox = '';
        }
        return (
            <div>
                <NotificationCenter ref="notificationCenter" />
                {loadingScreen}
                {footerBox}
                <ShortcutsModal show={this.state.showShortcutsModal} close={this.toggleShortcutsModal} />
                <AudioPlayer ref="audioPlayerInbound" sourceFile="assets/sounds/inbound_ringtone.wav" />
                <AudioPlayer ref="audioPlayerOutbound" sourceFile="assets/sounds/outbound_ringtone.wav" />
                <AudioPlayer ref="audioPlayerHangup" sourceFile="assets/sounds/hangup_tone.wav" />
                <TransitionGroup>
                    {incomingCallModal}
                </TransitionGroup>
                {incomingWindow}
                {screenSharingModal}
                <Locations hash={this.shouldUseHashRouting} ref="router" onBeforeNavigation={this.checkRoute}>
                    <Location path="/"  handler={this.main} />
                    <Location path="/login" handler={this.login} />
                    <Location path="/logout" handler={this.logout} />
                    <Location path="/ready" handler={this.ready} />
                    <Location path="/call" handler={this.call} />
                    <Location path="/call/:targetUri" urlPatternOptions={{segmentValueCharset: 'a-zA-Z0-9-_ \.@'}} handler={this.callByUri} />
                    <Location path="/conference" handler={this.conference} />
                    <Location path="/conference/:targetUri" urlPatternOptions={{segmentValueCharset: 'a-zA-Z0-9-_~ %\.@'}}  handler={this.conferenceByUri} />
                    <Location path="/not-supported" handler={this.notSupported} />
                    <Location path="/preview" handler={this.preview} />
                    <NotFound handler={this.notFound} />
                </Locations>
            </div>
        );
    }

    notSupported() {
        const errorMsg = (
            <span>
                This application works in a browser that supports WebRTC (like recent versions
                of <a href="https://www.google.com/chrome/browser/desktop/" target="_blank" rel="noopener noreferrer">Chrome</a> or <a href="https://www.mozilla.org/firefox/new/" target="_blank" rel="noopener noreferrer">Firefox</a>)
                or in the standalone <a href="http://sylkserver.com/download/" target="_blank" rel="noopener noreferrer">Sylk application.</a>
            </span>
        );
        return (
            <div>
                <ErrorPanel errorMsg={errorMsg} />
                <RegisterBox
                    registrationInProgress={false}
                    handleRegistration={() => {}}
                />
            </div>
        );
    }

    notFound() {
        const status = {
            title   : '404',
            message : 'Oops, the page your looking for can\'t found: ' + window.location.pathname,
            level   : 'danger',
            width   : 'large'
        }
        return (
            <StatusBox
                {...status}
            />
        );
    }

    ready() {
        if (this.state.registrationState !== 'registered') {
            setTimeout(() => {
                this.refs.router.navigate('/login');
            });
            return false;
        };
        return (
            <div>
                <NavigationBar
                    notificationCenter = {this.notificationCenter}
                    account = {this.state.account}
                    logout = {this.logout}
                    preview = {this.startPreview}
                    toggleMute = {this.toggleMute}
                    toggleShortcuts = {this.toggleShortcutsModal}
                />
                <ReadyBox
                    account   = {this.state.account}
                    startCall = {this.startCall}
                    startConference = {this.startConference}
                    missedTargetUri = {this.state.missedTargetUri}
                    history = {this.state.history}
                    key = {this.state.missedTargetUri}
                    serverHistory = {this.state.serverHistory}
                />
            </div>
        );
    }

    preview() {
        if (this.state.registrationState !== 'registered') {
            setTimeout(() => {
                this.refs.router.navigate('/login');
            });
            return false;
        };
        return (
            <div>
                <Preview
                    localMedia = {this.state.localMedia}
                    hangupCall = {this.hangupCall}
                    setDevice = {this.setDevice}
                    selectedDevices = {this.state.devices}
                />
            </div>
        );
    }

    call() {
        if (this.state.registrationState !== 'registered') {
            setTimeout(() => {
                this.refs.router.navigate('/login');
            });
            return false;
        };
        return (
            <Call
                localMedia = {this.state.localMedia}
                account = {this.state.account}
                targetUri = {this.state.targetUri}
                currentCall = {this.state.currentCall}
                escalateToConference = {this.escalateToConference}
                hangupCall = {this.hangupCall}
                shareScreen = {this.switchScreensharing}
                generatedVideoTrack = {this.state.generatedVideoTrack}
            />
        )
    }

    callByUri(urlParameters) {
        // check if the uri contains a domain
        if (urlParameters.targetUri.indexOf('@') === -1) {
            const status = {
                title   : 'Invalid user',
                message : `Oops, the domain of the user is not set in '${urlParameters.targetUri}'`,
                level   : 'danger',
                width   : 'large'
            }
            return (
                <StatusBox
                    {...status}
                />
            );
        }
        return (
            <CallByUriBox
                handleCallByUri = {this.handleCallByUri}
                notificationCenter = {this.notificationCenter}
                targetUri = {urlParameters.targetUri}
                localMedia = {this.state.localMedia}
                account = {this.state.account}
                currentCall = {this.state.currentCall}
                hangupCall = {this.hangupCall}
                shareScreen = {this.switchScreensharing}
                generatedVideoTrack = {this.state.generatedVideoTrack}
            />
        );
    }

    conference() {
        if (this.state.registrationState !== 'registered') {
            setTimeout(() => {
                this.refs.router.navigate('/login');
            });
            return false;
        };
        return (
            <Conference
                notificationCenter = {this.notificationCenter}
                localMedia = {this.state.localMedia}
                account = {this.state.account}
                targetUri = {this.state.targetUri}
                currentCall = {this.state.currentCall}
                participantsToInvite = {this.participantsToInvite}
                hangupCall = {this.hangupCall}
                shareScreen = {this.switchScreensharing}
                generatedVideoTrack = {this.state.generatedVideoTrack}
                propagateKeyPress = {this.togglePropagateKeyPress}
                toggleShortcuts = {this.toggleShortcutsModal}
            />
        )
    }

    conferenceByUri(urlParameters) {
        const targetUri = utils.normalizeUri(urlParameters.targetUri, config.defaultConferenceDomain);
        const idx = targetUri.indexOf('@');
        const uri = {};
        const pattern = /^[A-Za-z0-9\-\_]+$/g;
        uri.user = targetUri.substring(0, idx);

        // check if the uri.user is valid
        if (!pattern.test(uri.user)) {
            const status = {
                title   : 'Invalid conference',
                message : `Oops, the conference ID is invalid: ${targetUri}`,
                level   : 'danger',
                width   : 'large'
            }
            return (
                <StatusBox
                    {...status}
                />
            );
        }

        return (
            <ConferenceByUriBox
                notificationCenter = {this.notificationCenter}
                handler = {this.handleConferenceByUri}
                targetUri = {targetUri}
                localMedia = {this.state.localMedia}
                account = {this.state.account}
                currentCall = {this.state.currentCall}
                hangupCall = {this.hangupCall}
                shareScreen = {this.switchScreensharing}
                generatedVideoTrack = {this.state.generatedVideoTrack}
                propagateKeyPress = {this.togglePropagateKeyPress}
                toggleShortcuts = {this.toggleShortcutsModal}
            />
        );
    }

    login() {
        let registerBox;
        let statusBox;
        if (this.state.status !== null) {
            statusBox = (
                <StatusBox
                    message={this.state.status.msg}
                    level={this.state.status.level}
                />
            );
        }

        if (this.state.registrationState !== 'registered') {
            registerBox = (
                <RegisterBox
                    registrationInProgress = {this.state.registrationState !== null && this.state.registrationState !== 'failed'}
                    handleRegistration = {this.handleRegistration}
                    autoLogin = {this.shouldUseHashRouting}
                />
            );
        }

        return (
            <div>
                {registerBox}
                {statusBox}
            </div>
        );
    }

    logout() {
        setTimeout(() => {
            if (this.state.registrationState !== null && (this.state.mode === MODE_NORMAL || this.state.mode === MODE_PRIVATE)) {
                this.state.account.unregister();
            }

            if (this.state.account !== null) {
                this.state.connection.removeAccount(this.state.account,
                    (error) => {
                        if (error) {
                            DEBUG(error);
                        }
                    }
                );
            }
            if (this.shouldUseHashRouting) {
                storage.set('account', {accountId: this.state.accountId, password: ''});
            }
            this.setState({account: null, registrationState: null, status: null, serverHistory: []});
            this.refs.router.navigate('/login');
        });
        return <div></div>;
    }

    main() {
        return (
            <div></div>
        );
    }
}


ReactDOM.render((<Blink />), document.getElementById('app'));
