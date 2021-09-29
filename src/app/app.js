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
const cloneDeep                 = require('lodash/cloneDeep');
const debug                     = require('debug');
const DigestAuthRequest         = require('digest-auth-request');

const RegisterBox          = require('./components/RegisterBox');
const ReadyBox             = require('./components/ReadyBox');
const Call                 = require('./components/Call');
const CallByUriBox         = require('./components/CallByUriBox');
const CallCompleteBox      = require('./components/CallCompleteBox');
const Chat                 = require('./components/Chat');
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
const RedialScreen         = require('./components/RedialScreen');
const NavigationBar        = require('./components/NavigationBar');
const Preview              = require('./components/Preview');
const ScreenSharingModal   = require('./components/ScreenSharingModal');
const ShortcutsModal       = require('./components/ShortcutsModal');
const EncryptionModal      = require('./components/EncryptionModal');
const ImportModal          = require('./components/ImportModal');
const NewDeviceModal       = require('./components/NewDeviceModal');

const utils     = require('./utils');
const config    = require('./config');
const storage   = require('./storage');
const messageStorage = require('./messageStorage');
const keyStorage     = require('./keyStorage');
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
            contactCache: new Map(),
            oldMessages: {},
            inboundCall: null,
            showIncomingModal: false,
            showScreenSharingModal: false,
            showShortcutsModal: false,
            showImportModal: false,
            showEncryptionModal: false,
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
            propagateKeyPress: false,
            showRedialScreen: false,
            resumeCall: false,
            messagesLoading: false,
            importMessage: {},
            export: false,
            transmitKeys: false,
            showNewDeviceModal: false,
            enableMessaging: false
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
            'handleRetry',
            'handleRegistration',
            'startCall',
            'startConference',
            'answerCall',
            'resumeCall',
            'rejectCall',
            'hangupCall',
            'outgoingCall',
            'incomingCall',
            'missedCall',
            'importKey',
            'useExistingKey',
            'enableMessaging',
            'loadMessages',
            'incomingMessage',
            'outgoingMessage',
            'sendingMessage',
            'removeMessage',
            'messageStateChanged',
            'sendingDispositionNotification',
            'syncConversations',
            'readConversation',
            'removeConversation',
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
            'callComplete',
            'chat',
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
            'toggleEncryptionModal',
            'toggleImportModal',
            'togglePropagateKeyPress',
            'toggleRedialScreen',
            'toggleNewDeviceModal',
            'getLocalScreen',
            'getServerHistory',
            'getLocalMediaGuestWrapper',
            'getLocalMedia'
        ].forEach((name) => {
            this[name] = this[name].bind(this);
        });
        this.participantsToInvite = null;
        this.redirectTo = null;
        this.prevPath = null;
        this.shouldUseHashRouting = false;
        this.muteIncoming = false;
        this.connectionNotification = null;
        this.resumeVideoCall = true;
        this.isRetry = false;
        this.entryPath = '';
        this.lastMessageFocus = '';
        this.retransmittedMessages = [];
    }

    get _notificationCenter() {
        // getter to lazy-load the NotificationCenter ref
        if (!this.__notificationCenter) {
            this.__notificationCenter = this.refs.notificationCenter;
        }
        return this.__notificationCenter;
    }

    componentWillMount() {
        // Check if we should use hash routing
        if (typeof window.process !== 'undefined') {
            if (window.process.versions.electron !== '') {
                this.shouldUseHashRouting = true;
            }
        }

        storage.initialize(this.shouldUseHashRouting);

        if (window.location.hash.startsWith('#!/')) {
            this.redirectTo = window.location.hash.replace('#!', '');
        } else {
            // Disallowed routes, they will rendirect to /login
            const disallowedRoutes = new Set(['/', '/ready','/call','/chat', '/preview']);

            if (disallowedRoutes.has(window.location.pathname)) {
                this.redirectTo = '/login';
            }

            if (/^\/conference\/?$/g.test(window.location.pathname)) {
                this.redirectTo = `/conference/${utils.generateSillyName()}`;
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

        // Load contact cache
        storage.get('contactCache').then((cache) => {
            if (cache) {
                this.setState({contactCache: new Map(cache)})
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
                if (this.connectionNotification !== null) {
                    this._notificationCenter.removeNotification(this.connectionNotification);
                    this.connectionNotification = null;
                }
                if (this.state.showRedialScreen === true) {
                    this.toggleRedialScreen(true);
                }
                this.processRegistration(this.state.accountId, this.state.password, this.state.displayName);
                break;
            case 'disconnected':
                this.refs.audioPlayerOutbound.stop();
                this.refs.audioPlayerInbound.stop();

                if (this.state.localMedia) {
                    if (this.state.localMedia.getVideoTracks().length === 0) {
                        this.resumeVideoCall = false;
                    } else if (this.state.localMedia.getVideoTracks()[0].readyState === 'ended') {
                        this.resumeVideoCall = false;
                    }
                    sylkrtc.utils.closeMediaStream(this.state.localMedia);
                }

                if (this.state.currentCall) {
                    if (this.state.currentCall.direction === 'outgoing') {
                        this.toggleRedialScreen(false);
                    } else {
                        this.refs.router.navigate(this.entryPath);
                    }
                    this.state.currentCall.removeListener('stateChanged', this.callStateChanged);
                    this.state.currentCall.terminate();
                }

                if (this.state.inboundCall && this.state.inboundCall !== this.state.currentCall) {
                    this.state.inboundCall.removeListener('stateChanged', this.inboundCallStateChanged);
                    this.state.inboundCall.terminate();
                }

                this.setState({
                    registrationState: null,
                    showIncomingModal: false,
                    currentCall: null,
                    inboundCall: null,
                    localMedia: null,
                    generatedVideoTrack: false
                });
                break;
            default:
                if (this.state.account === null) {
                    this.setState({loading: 'Connecting...'});
                } else {
                    if (!this.state.showRedialScreen) {
                        const reconnect = () => {
                            this._notificationCenter.toggleConnectionLostNotification(true, this.connectionNotification);
                            this.state.connection.reconnect();
                        };
                        if (this.connectionNotification === null) {
                            this.connectionNotification = this._notificationCenter.postConnectionLost(reconnect);
                        } else {
                            this._notificationCenter.toggleConnectionLostNotification(false, this.connectionNotification, reconnect);
                        }
                    }
                }
                break;
        }
    }

    notificationCenter() {
        return this._notificationCenter;
    }

    retransmitMessages() {
        let num = this.retransmittedMessages.length;
        if (num !== 0) {
            this.setState({messagesLoading: true});
        }
        for (let message of this.retransmittedMessages.reverse()) {
            if (message.state === 'pending' || message.state === 'failed') {
                DEBUG('Try to remove: %o', message.id);
                messageStorage.removeMessage(message).then(()=> {
                    DEBUG('Message removed: %o', message.id);
                });
                DEBUG('Retransmitting: %o', message);
                let messagesLoading = true;
                let newMessage = this.state.account.sendMessage(message.receiver, message.content, message.contentType, {timestamp: message.timestamp}, () => {
                    const messagesCopy = cloneDeep(this.state.oldMessages)
                    const contact = message.receiver;
                    const newMessages = []
                    if (messagesCopy[contact]) {
                        for (let i = 0; i < messagesCopy[contact].length; i++) {
                            if (messagesCopy[contact][i].id !== message.id) {
                                newMessages.push(messagesCopy[contact][i]);
                            }
                        }
                        messagesCopy[contact] = newMessages;
                        num--;
                        if (num === 0) {
                            messagesLoading = false;
                        }
                        this.setState({oldMessages: messagesCopy, messagesLoading: messagesLoading});
                    }
                });
            }
        }
    }

    registrationStateChanged(oldState, newState, data) {
        DEBUG('Registration state changed! ' + newState);
        this.setState({registrationState: newState});
        const path = this.refs.router.getPath();
        if (newState === 'failed') {
            if (path === '/login') {
                let reason = data.reason;
                if (reason.match(/904/)) {
                    // Sofia SIP: WAT
                    reason = 'Wrong account or password';
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
            } else {
                setTimeout(() => {
                    this.state.account.register();
                }, 5000);
            }
        } else if (newState === 'registered') {
            if (path === '/login') {
                this.setState({loading: null});
            }
            messageStorage.initialize(this.state.accountId, storage.instance(), this.shouldUseHashRouting);
            keyStorage.initialize(this.state.accountId, storage.instance(), this.shouldUseHashRouting);

            let { privateKey, publicKey, revocationCertificate } = '';

            if (this.state.enableMessaging) {
                this.enableMessaging(true);
            }
            storage.get('pgpKeys').then(pgpKeys => {
                if (pgpKeys) {
                    privateKey = pgpKeys.privateKey;
                    publicKey = pgpKeys.publicKey;
                } else {
                    return Promise.reject();
                }
                this.state.account.checkIfKeyExists((fetchedPublicKey) => {
                    if (fetchedPublicKey !== publicKey) {
                        if (fetchedPublicKey == null) {
                            // We have a key, but the server has not
                            this.setState({loading: null, transmitKeys: true})

                            this.state.account.addPGPKeys({publicKey, privateKey});
                            keyStorage.getAll().then(key =>
                                this.state.account.pgp.addPublicPGPKeys(key)
                            );
                            this.state.account.pgp.on('publicKeyAdded', (key) => {
                                keyStorage.add(key);
                            });
                            this.enableMessaging();
                            this.loadMessages();
                        } else {
                            // We have a key, but the server has a different key
                            this.toggleEncryptionModal();
                        }
                    } else {
                        // Our key and the key on the server matches
                        this.state.account.addPGPKeys({publicKey, privateKey});
                        keyStorage.getAll().then(key =>
                            this.state.account.pgp.addPublicPGPKeys(key)
                        );
                        this.state.account.pgp.on('publicKeyAdded', (key) => {
                            keyStorage.add(key);
                        });
                        this.enableMessaging();
                        this.loadMessages();
                    }
                });
            }).catch(() => {
                DEBUG('No keys found in storage');
                this.state.account.checkIfKeyExists((publicKey) => {
                    if (publicKey === null) {
                        // There is no key on the server and we have none
                        this.setState({loading: 'Generating keys for PGP encryption'})
                        setImmediate(() => {
                            this.state.account.generatePGPKeys((result) => {
                                if (this.state.mode !== MODE_PRIVATE) {
                                    storage.set('pgpKeys', result);
                                }
                                this.setState({loading: null, transmitKeys: true})
                            });
                            keyStorage.getAll().then(key =>
                                this.state.account.pgp.addPublicPGPKeys(key)
                            );
                            this.state.account.pgp.on('publicKeyAdded', (key) => {
                                keyStorage.add(key);
                            });
                            this.loadMessages();
                        });
                    } else {
                        this.toggleNewDeviceModal();
                        // There is a key on the server and we have none
                    }
                });
            });
            if (path === '/login') {
                this.refs.router.navigate('/ready');
                return;
            }
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
            case 'established':
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
                    reason = 'Forbidden';
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
                let resetTargetUri = callSuccesfull || config.useServerCallHistory;
                if (this.state.mode === MODE_GUEST_CALL || this.state.mode === MODE_GUEST_CONFERENCE) {
                    if (callSuccesfull === false) {
                        resetTargetUri = false;
                        this.failureReason = reason;
                    }
                    this.entryPath = '/ready';
                }
                this.setState({
                    currentCall         : null,
                    targetUri           : resetTargetUri ? '' : this.state.targetUri,
                    showIncomingModal   : false,
                    inboundCall         : null,
                    localMedia          : null,
                    generatedVideoTrack : false,
                    previousTargetUri   : this.state.targetUri
                });
                this.setFocusEvents(false);
                this.participantsToInvite = null;
                this.refs.router.navigate(this.entryPath);
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

    handleConferenceByUri(displayName, targetUri, extraOptions = {}) {
        const accountId = `${utils.generateUniqueId()}@${config.defaultGuestDomain}`;
        const mediaConstraints = extraOptions.mediaConstraints || {audio: true, video: true};
        const lowBandwidth = extraOptions.lowBandwidth || false;
        this.setState({
            accountId      : accountId,
            password       : '',
            displayName    : displayName,
            mode           : MODE_GUEST_CONFERENCE,
            targetUri      : targetUri,
            loading        : 'Connecting...',
            lowBandwidth   : lowBandwidth,
            preferredGuestMedia : mediaConstraints
        });

        if (this.state.connection === null) {
            this.connect();
        } else {
            DEBUG('Connection Present, try to register');
            this.processRegistration(accountId, '', displayName);
        }
    }

    handleRetry() {
        const accountId = `${utils.generateUniqueId()}@${config.defaultGuestDomain}`;
        this.isRetry = true;
        this.setState({
            accountId      : accountId,
            password       : '',
            loading        : 'Connecting...',
            targetUri      : this.state.targetUri || this.state.previousTargetUri
        });

        if (this.state.connection === null) {
            this.connect();
        } else {
            DEBUG('Connection Present, try to register');
            this.processRegistration(accountId, '', this.state.displayName);
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
        let pendingFailedMessages = [];
        this.retransmittedMessages = [];
        let oldMessages = {};
        if (this.state.account !== null) {
            DEBUG('We already have an account, removing it');
            // Preserve messages from account
            if (accountId === this.state.accountId) {
                oldMessages = cloneDeep(this.state.oldMessages);
                const messages = this.state.account.messages;
                let index = 0;
                for (let message of messages.reverse()) {
                    if (message.state === 'pending' || message.state === 'failed') {
                        index = index + 1;
                        pendingFailedMessages.push(message);
                    } else {
                        break;
                    }
                }
                this.retransmittedMessages = pendingFailedMessages;
                let counter = 0;
                for (let message of this.state.account.messages) {
                    const senderUri = message.sender.uri;
                    const receiver = message.receiver;
                    let key = receiver;
                    if (message.state === 'received') {
                        key = senderUri;
                    }
                    if (!oldMessages[key]) {
                        oldMessages[key] = [];
                    }
                    if (!oldMessages[key].find(loadedMessage => loadedMessage.id === message.id)) {
                        oldMessages[key].push(message);
                        counter += 1;
                    }
                };
                DEBUG('Old messages to save: %s', counter);
                DEBUG('Messages to send again: %s', pendingFailedMessages.length);
            }
            try {
                this.state.connection.removeAccount(this.state.account,
                    (error) => {
                        if (error) {
                            DEBUG(error);
                        }
                        this.setState({account: null, registrationState: null});
                    }
                );
            }
            catch(error) {
                this.setState({registrationState: null});
            }
            this.setState({serverHistory: []});
            this.getServerHistory();
        }

        const options = {
            account: accountId,
            password: password,
            displayName: displayName,
            ha1: true
        };

        if (accountId.indexOf('@') !== -1) {
            const [usename, domain] = accountId.split('@');
            if (config.nonSipDomains.indexOf(domain) !== -1) {
                options.ha1 = false;
            }
        }

        try {
            const account = this.state.connection.addAccount(options, (error, account) => {
                if (!error) {
                    account.on('outgoingCall', this.outgoingCall);
                    account.on('conferenceCall', this.outgoingCall);
                    if (this.state.resumeCall === true) {
                        this.resumeCall();
                        this.setState({resumeCall: false});
                    }
                    switch (this.state.mode) {
                        case MODE_PRIVATE:
                        case MODE_NORMAL:
                            account.on('registrationStateChanged', this.registrationStateChanged);
                            account.on('incomingCall', this.incomingCall);
                            account.on('missedCall', this.missedCall);
                            account.on('conferenceInvite', this.conferenceInvite);

                            // Messaging handlers
                            account.on('processingFetchedMessages', ()=> {
                                this.setState({messagesLoading: true});
                            });
                            account.on('outgoingMessage', this.outgoingMessage);
                            this.setState({account: account, oldMessages: oldMessages});
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
                                            messageStorage.initialize(account.accountId, storage.instance(), this.shouldUseHashRouting);
                                            DEBUG('Clearing message storage for: %s', account.accountId);
                                            messageStorage.dropInstance().then(() => {
                                                messageStorage.close();
                                                this.setState({oldMessages: {}});
                                            });
                                            storage.remove('lastMessageId');
                                            storage.remove('pgpKeys');
                                        }
                                    });
                                    storage.set('account', {accountId: this.state.accountId, password: ''});
                                }
                            } else {
                                // Wipe storage if private login
                                storage.get('account').then((account) => {
                                    if (account && account.accountId !== this.state.accountId) {
                                        messageStorage.initialize(account.accountId, storage.instance(), this.shouldUseHashRouting);
                                        DEBUG('Clearing message storage for: %s', account.accountId);
                                        messageStorage.dropInstance().then(() => {
                                            messageStorage.close();
                                            this.setState({oldMessages: {}});
                                        });
                                        storage.remove('lastMessageId');
                                        storage.remove('pgpKeys');
                                    }
                                });
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
        } catch(error) {
            DEBUG('Add account error: ' + error);
        }
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
        const path = this.refs.router.getPath();
        if (path === '/preview') {
            sylkrtc.utils.closeMediaStream(this.state.localMedia);
            this.getLocalMedia();
        }
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

    getLocalMediaGuestWrapper(mediaConstraints={audio: true, video: true}, nextRoute=null) {    // eslint-disable-line space-infix-ops
        this.setState({mode : MODE_GUEST_CONFERENCE});
        setImmediate(() => this.getLocalMedia(mediaConstraints, nextRoute));
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
        }, 750);


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
        if (this.isRetry) {
            this.getLocalMedia({audio: true, video: true}, `/call/${targetUri}`);
        } else {
            // this.getLocalMedia(Object.assign({audio: true, video: true}, options));
        }
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

    toggleEncryptionModal() {
        this.setState({
            showEncryptionModal : !this.state.showEncryptionModal,
            export: this.state.showEncryptionModal && false
        });
    }

    toggleImportModal() {
        this.setState({
            showImportModal : !this.state.showImportModal
        });
    }

    toggleNewDeviceModal() {
        this.setState({
            showNewDeviceModal : !this.state.showNewDeviceModal
        });
    }

    toggleRedialScreen(resume = false) {
        let nextState = !this.state.showRedialScreen;
        this.setState({
            showRedialScreen : nextState,
            resumeCall: resume
        });
        if (this.state.connection.state !== 'ready' && nextState === false && (this.state.mode === MODE_NORMAL || this.state.mode === MODE_PRIVATE)) {
            const reconnect = () => {
                this._notificationCenter.toggleConnectionLostNotification(true, this.connectionNotification);
                this.state.connection.reconnect();
            };
            if (this.connectionNotification === null) {
                this.connectionNotification = this._notificationCenter.postConnectionLost(reconnect);
            }
        }
    }

    togglePropagateKeyPress() {
        this.setState({
            propagateKeyPress : !this.state.propagateKeyPress
        });
    }

    resumeCall() {
        if (this.state.targetUri.endsWith(`@${config.defaultConferenceDomain}`)) {
            this.startConference(this.state.targetUri, {
                mediaConstraints: {audio: true, video: this.resumeVideoCall},
                roomMedia: this.state.roomMedia,
                lowBandwidth: this.state.lowBandwidth
            });
        } else {
            this.startCall(this.state.targetUri, {audio: true, video: this.resumeVideoCall});
            this.resumeVideoCall = true;
        }
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
            this.refs.router.navigate(this.entryPath);
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

    startConference(targetUri, extraOptions = {}) {
        const mediaConstraints = extraOptions.mediaConstraints || {audio: true, video: true};
        const roomMedia = extraOptions.roomMedia || {audio: true, video: true};
        const lowBandwidth = extraOptions.lowBandwidth || false;
        this.setState({targetUri: targetUri, roomMedia: roomMedia, lowBandwidth: lowBandwidth});
        this.getLocalMedia(mediaConstraints, '/conference');
    }

    startGuestConference(targetUri) {
        this.setState({targetUri: targetUri});
        if (this.isRetry) {
            this.getLocalMedia(this.state.preferredGuestMedia, `/conference/${targetUri}`);
        } else {
            // this.getLocalMedia(this.state.preferredGuestMedia);
        }
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

    importKey(message) {
        let { privateKey, publicKey, revocationCertificate } = '';

        const regexp = /(?<publicKey>-----BEGIN PGP PUBLIC KEY BLOCK-----[^]*-----END PGP PUBLIC KEY BLOCK-----)[^]*(?<privateKey>-----BEGIN PGP PRIVATE KEY BLOCK-----[^]*-----END PGP PRIVATE KEY BLOCK-----)/gi;

        DEBUG(regexp)
        let match = regexp.exec(message.content);
        do {
            if (match === null) {
                return;
            }
            publicKey = match.groups.publicKey;
            privateKey = match.groups.privateKey;
            if (privateKey === '' || publicKey === '') {
                DEBUG('Import failed');
                return;
            }
        } while((match = regexp.exec(message.content)) !== null);

        storage.get('pgpKeys').then(storedKeys => {
            if (storedKeys && publicKey === storedKeys.publicKey) {
                DEBUG('Imported key(s) are the same, skipping');
                return;
            }
            if (this.state.mode !== MODE_PRIVATE) {
                storage.set('pgpKeys', {publicKey, privateKey});
            }
            this.state.account.addPGPKeys({publicKey, privateKey});

            keyStorage.getAll().then(key =>
                this.state.account.pgp.addPublicPGPKeys(key)
            );
            this.state.account.pgp.on('publicKeyAdded', (key) => {
                keyStorage.add(key);
            });

            this.enableMessaging();
            this.loadMessages();
        });
    }

    useExistingKey(password) {
        storage.get('pgpKeys').then(pgpKeys => {
            if (pgpKeys !== null && pgpKeys.publicKey && pgpKeys.privateKey) {
                this.state.account.addPGPKeys(pgpKeys);
                this.state.account.exportPrivateKey(password);

                keyStorage.getAll().then(key =>
                    this.state.account.pgp.addPublicPGPKeys(key)
                );
                this.state.account.pgp.on('publicKeyAdded', (key) => {
                    keyStorage.add(key);
                });
                this.enableMessaging();
                this.loadMessages();
            }
        });
    }

    enableMessaging(reenable = false) {
        if (!this.state.enableMessaging || reenable) {
            DEBUG("Enable message events");
            this.setState({enableMessaging: true});
            // Add message events
            this.state.account.on('incomingMessage', this.incomingMessage);
            this.state.account.on('sendingMessage', this.sendingMessage);
            this.state.account.on('sendingDispositionNotification', this.sendingDispositionNotification);
            this.state.account.on('messageStateChanged', this.messageStateChanged);
            this.state.account.on('syncConversations', this.syncConversations);
            this.state.account.on('readConversation', this.readConversation);
            this.state.account.on('removeConversation', this.removeConversation);
            this.state.account.on('removeMessage', this.removeMessage);
        }
    }

    loadMessages() {
        this.setState({messagesLoading: true})
        messageStorage.loadLastMessages().then((cache) => {
            this.setState({oldMessages: cache})
            storage.get('lastMessageId').then(id =>
                this.state.account.syncConversations(id, (error) => {
                    if (error) {
                        this.retransmitMessages();
                    }
                })
            );
        });
    }

    incomingMessage(message) {
        DEBUG('Incoming Message from: %s', message.sender.uri);
        if (this.retransmittedMessages.findIndex(m => message.id === m.id) !== -1) {
            DEBUG('Message was previously removed, not adding: %s', message.id);
            return;
        }

        messageStorage.add(message);

        storage.set('lastMessageId', message.id);
        if (message.sender.displayName !== null
            && (!this.state.contactCache.has(message.sender.uri)
            || (this.state.contactCache.has(message.sender.uri)
                && this.state.contactCache.get(message.sender.uri) !== message.sender.displayName)
            )
        ) {
            DEBUG('Updating contact cache');
            const oldContactCache = new Map(this.state.contactCache);
            oldContactCache.set(message.sender.uri, message.sender.displayName)
            this.setState({contactCache: oldContactCache})
            storage.set('contactCache', Array.from(oldContactCache));
        }
        const path = this.refs.router.getPath();
        if (path !== '/chat') {
            if (this.state.currentCall === null) {
                this._notificationCenter.postNewMessage(message, () => {
                    this.lastMessageFocus = message.sender.uri;
                    this.refs.router.navigate('/chat');
                });
            } else {
                this._notificationCenter.postNewMessage(message);
            }
        }
    }

    outgoingMessage(message) {
        if (message.contentType === 'text/pgp-private-key') {
            DEBUG('Starting key import');

            const regexp = /(?<publicKey>-----BEGIN PGP PUBLIC KEY BLOCK-----[^]*-----END PGP PUBLIC KEY BLOCK-----)/ig;
            let publicKey = null
            let match = regexp.exec(message.content);
            do {
                if (match) {
                    publicKey = match.groups.publicKey;
                }
            } while((match = regexp.exec(message.content)) !== null);

            if (publicKey !== null) {
                storage.get('pgpKeys').then(pgpKeys => {
                    if (pgpKeys && publicKey === pgpKeys.publicKey.trim()) {
                        DEBUG('Public keys are the same, aborting');
                        return;
                    }
                    if (this.state.showNewDeviceModal) {
                        this.toggleNewDeviceModal()
                    }
                    this.setState({importMessage: message, showImportModal: true});
                });
            } else {
                if (this.state.showNewDeviceModal) {
                    this.toggleNewDeviceModal()
                }
                this.setState({importMessage: message, showImportModal: true});
            }
        }
    }

    sendingMessage(message) {
        if (message.contentType !== 'text/pgp-private-key') {
            messageStorage.add(message);
        }
    }

    removeMessage(message) {
        messageStorage.removeMessage(message).then(()=> {
            DEBUG('Message removed: %o', message.id);
        });
        let oldMessages = cloneDeep(this.state.oldMessages);
        let contact = message.receiver;
        if (message.state === 'received') {
            contact = message.sender.uri;
        }
        if (oldMessages[contact]) {
            oldMessages[contact] = oldMessages[contact].filter(loadedMessage => loadedMessage.id !== message.id);
        }
        this.setState({oldMessages: oldMessages});
    }

    messageStateChanged(id, state, data, fromSync = false) {
        DEBUG('Message state changed: %o', id);
        if (this.state.importMessage && this.state.importMessage.id === id) {
            DEBUG('Skipping state update for importKeyMessage: %o', id);
            return;
        }

        messageStorage.update({messageId: id, state});
        let found = false;
        if (state === 'accepted' && !fromSync) {
            storage.set('lastMessageId', id);
        }
        const oldMessages = cloneDeep(this.state.oldMessages);
        for (const [key, messages] of Object.entries(oldMessages)) {
            const newMessages = cloneDeep(messages).map(loadedMessage => {
                if (id === loadedMessage.id && state !== loadedMessage.state && loadedMessage.state != 'displayed') {
                    loadedMessage.state = state;
                    found = true;
                    DEBUG('Updating state for loaded messages');
                }
                return loadedMessage;
            });
            if (found) {
                oldMessages[key] = newMessages;
                this.setState({oldMessages: oldMessages});
                break;
            }
        };
    }

    sendingDispositionNotification(id, state, error) {
        if (!error) {
            messageStorage.updateDisposition(id, state);
            let found = false;
            const oldMessages = cloneDeep(this.state.oldMessages);
            for (const [key, messages] of Object.entries(oldMessages)) {
                const newMessages = cloneDeep(messages).map(message => {
                    if (!(message instanceof require('events').EventEmitter)
                        && message.id === id && message.dispositionState !== state) {
                        message.dispositionState = state;
                        found = true;
                        DEBUG('Updating dispositionState for loaded messages');
                    }
                    return message;
                });
                if (found) {
                    oldMessages[key] = newMessages;
                    this.setState({oldMessages: oldMessages});
                    break;
                }
            };
        }
    }

    syncConversations(messages) {
        this.setState({messagesLoading: true})
        DEBUG('Got messages from server: %o', messages);
        const promises = []
        promises.push(messageStorage.updateIdMap());
        let lastId = '';
        for (const fetchedMessage of messages) {
            DEBUG(fetchedMessage)
            if (fetchedMessage.contentType === 'message/imdn') {
                let decodedContent = fetchedMessage.content;
                promises.push(messageStorage.update({messageId: decodedContent.message_id, state: decodedContent.state}));
                continue;
            }
            if (fetchedMessage.contentType === 'application/sylk-conversation-remove') {
                const contact = fetchedMessage.content
                promises.push(messageStorage.remove(contact));
                continue;
            }
            if (fetchedMessage.contentType === 'application/sylk-message-remove') {
                const message = fetchedMessage.content;
                message.id = message.message_id;
                message.receiver = message.contact;
                promises.push(messageStorage.removeMessage(message).then(()=> {
                    DEBUG('Message removed: %o', message.id);
                }));
                continue;
            }

            if (fetchedMessage.contentType === 'application/sylk-conversation-read') {
                const contact = fetchedMessage.content
                promises.push(messageStorage.loadLastMessages().then(allMessages => {
                    if (allMessages) {
                        const messages = allMessages[contact];
                        if (!messages) {
                            return;
                        }

                        for (let message of messages) {
                            if (message.state == 'received'
                                && message.dispositionState !== 'displayed'
                                && message.dispositionNotification.indexOf('display') !== -1
                            ) {
                                this.sendingDispositionNotification(message.id, 'displayed')
                            }
                        }
                    }
                }));
                continue;
            }
            let message = Object.assign({}, fetchedMessage);
            promises.push(messageStorage.add(fetchedMessage));
            if (message.state == 'received'
                && message.dispositionNotification.indexOf('positive-delivery') !== -1
                ) {
                this.state.account.sendDispositionNotification(
                    message.receiver,
                    message.id,
                    message.timestamp,
                    'delivered'
                );
            }
        }
        if (lastId !== '') {
            promises.push(storage.set('lastMessageId', lastId));
        }
        Promise.all(promises).then(() =>
            messageStorage.loadLastMessages().then(messages => {
                if (messages) {
                    this.setState({oldMessages: messages, messagesLoading: false})
                }
                setImmediate(() => this.retransmitMessages());
                if (this.state.transmitKeys) {
                    setImmediate(() => {
                        storage.get('pgpKeys').then(pgpKeys => {
                            if (pgpKeys) {
                                for (let contact of Object.keys(this.state.oldMessages)) {
                                    if (contact !== this.state.accountId) {
                                        this.state.account.sendMessage(contact, pgpKeys.publicKey, 'text/pgp-public-key')
                                    }
                                }
                            }
                        });
                        this.setState({transmitKeys: false});
                    });
                }
            })
        );
    }

    readConversation(contact) {
        const oldMessages = cloneDeep(this.state.oldMessages);
        const messages = oldMessages[contact];
        let found = false;
        const newMessages = cloneDeep(messages).map(message => {
            messageStorage.updateDisposition(message.id, 'displayed');
            if (!(message instanceof require('events').EventEmitter)
                && message.state == 'received'
                && message.dispositionState !== 'displayed'
                && message.dispositionNotification.indexOf('display') !== -1
            ) {
                message.dispositionState = 'displayed';
                DEBUG('Updating dispositionState for loaded message');
                found = true;
            }
            return message;
        });
        if (found) {
            oldMessages[contact] = newMessages;
        }
        for (let message of  this.state.account.messages) {
            if (message.sender.uri === contact
                && message.state === 'received'
                && message.dispositionNotification.indexOf('display') !== -1
            ) {
                messageStorage.updateDisposition(message.id, 'displayed');
            }
        }
        this.setState({oldMessages: oldMessages});
    }

    removeConversation(contact) {
        messageStorage.remove(contact)
        let oldMessages = cloneDeep(this.state.oldMessages);
        delete oldMessages[contact];
        if (this.lastMessageFocus === contact) {
            this.lastMessageFocus = '';
        }
        this.setState({oldMessages: oldMessages});
    }


    conferenceInvite(data) {
        DEBUG('Conference invite from %o to %s', data.originator, data.room);
        if (this.state.currentCall && this.state.targetUri === data.room) {
            DEBUG('Skipped conference invite since you are already in the room: %s', data.room);
            return
        }

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

        if (this.state.mode === MODE_GUEST_CALL || this.state.mode === MODE_GUEST_CONFERENCE) {
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
            if (data.placed) {
                data.placed.map(elem => {elem.direction = 'placed'; return elem});
            }
            if (data.received) {
                data.received.map(elem => {elem.direction = 'received'; return elem});
            }
            history = data.placed;
            if (data.received && history) {
                history = history.concat(data.received);
            }
            if (history) {
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
            }
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

            if (config.useServerCallHistory && nextPath === '/ready' && this.state.registrationState === 'registered') {
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

            // Preserve entry path
            if (nextPath === '/ready' || nextPath === '/chat') {
                this.entryPath = nextPath;
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
        let redialScreen;
        let incomingCallModal;
        let incomingWindow;
        let screenSharingModal;
        let footerBox = <FooterBox />;

        if (this.state.loading !== null) {
            loadingScreen = <LoadingScreen text={this.state.loading} />;
        }

        if (this.state.showRedialScreen) {
            redialScreen = (
                <RedialScreen
                    router={this.refs.router}
                    hide={this.toggleRedialScreen}
                />
            );
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
                        autoFocus = {this.state.propagateKeyPress === false}
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
                            autoFocus = {this.state.propagateKeyPress === false}
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
                {redialScreen}
                {footerBox}
                <ShortcutsModal show={this.state.showShortcutsModal} close={this.toggleShortcutsModal} />
                <EncryptionModal
                    show = {this.state.showEncryptionModal}
                    close = {this.toggleEncryptionModal}
                    export = {this.state.export}
                    useExistingKey = {this.useExistingKey}
                    exportKey = {(password) => {
                        this.state.account.exportPrivateKey(password)
                    }}
                />
                <NewDeviceModal
                    show={this.state.showNewDeviceModal}
                    close={this.toggleNewDeviceModal}
                    generatePGPKeys = {() => {
                        this.setState({loading: 'Generating keys for PGP encryption'});
                        setImmediate(() => {
                            this.state.account.generatePGPKeys((result) => {
                                if (this.state.mode !== MODE_PRIVATE) {
                                    storage.set('pgpKeys', result);
                                }
                                this.toggleNewDeviceModal();
                                this.setState({loading: null, transmitKeys: true});

                            });
                            keyStorage.getAll().then(key =>
                                this.state.account.pgp.addPublicPGPKeys(key)
                            );
                            this.state.account.pgp.on('publicKeyAdded', (key) => {
                                keyStorage.add(key);
                            });
                            this.enableMessaging();
                        });
                    }}
                />
                <ImportModal
                    importKey = {this.importKey}
                    message = {this.state.importMessage}
                    account = {this.state.account}
                    show = {this.state.showImportModal}
                    close = {this.toggleImportModal}
                />
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
                    <Location path="/call-complete" handler={this.callComplete} />
                    <Location path="/chat" handler={this.chat} />
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
        return (
            <div>
                <NavigationBar
                    notificationCenter = {this.notificationCenter}
                    account = {this.state.account}
                    logout = {this.logout}
                    preview = {this.startPreview}
                    toggleMute = {this.toggleMute}
                    toggleShortcuts = {this.toggleShortcutsModal}
                    router = {this.refs.router}
                    enableMessaging = {this.state.enableMessaging}
                    exportPrivateKey= {() => this.setState({export: true, showEncryptionModal: true})}
                />
                <ReadyBox
                    account   = {this.state.account}
                    startCall = {this.startCall}
                    startConference = {this.startConference}
                    missedTargetUri = {this.state.missedTargetUri}
                    history = {this.state.history}
                    key = {this.state.missedTargetUri}
                    serverHistory = {this.state.serverHistory}
                    noConnection = {this.state.connection.state !== 'ready'}
                />
            </div>
        );
    }

    preview() {
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
                setDevice = {this.setDevice}
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
                getLocalMedia = {this.getLocalMedia}
                setDevice = {this.setDevice}
            />
        );
    }

    callComplete() {
        return (
            <CallCompleteBox
                wasCall = {this.state.mode === MODE_GUEST_CALL}
                targetUri = {this.state.targetUri}
                failureReason = {this.failureReason}
                retryHandler = {this.handleRetry}
            />
        )
    }

    chat() {
        return (
            <div>
                <NavigationBar
                    notificationCenter = {this.notificationCenter}
                    account = {this.state.account}
                    logout = {this.logout}
                    preview = {this.startPreview}
                    toggleMute = {this.toggleMute}
                    toggleShortcuts = {this.toggleShortcutsModal}
                    router = {this.refs.router}
                    enableMessaging = {this.state.enableMessaging}
                    exportPrivateKey= {() => this.setState({export: true, showEncryptionModal: true})}
                />
                <Chat
                    key = {this.state.account}
                    account  = {this.state.account}
                    contactCache = {this.state.contactCache}
                    oldMessages = {this.state.oldMessages}
                    startCall = {this.startCall}
                    messageStorage = {messageStorage}
                    propagateKeyPress = {this.togglePropagateKeyPress}
                    focusOn = {this.lastMessageFocus}
                    removeChat = {(contact) => {
                        messageStorage.remove(contact);
                        let oldMessages = cloneDeep(this.state.oldMessages);
                        delete oldMessages[contact];
                        this.state.account.removeConversation(contact);
                        if (this.lastMessageFocus === contact) {
                            this.lastMessageFocus = '';
                        }
                        this.setState({oldMessages: oldMessages});
                    }}
                    loadMoreMessages = {(key) => {
                        messageStorage.loadMoreMessages(key).then((cache) => {
                            if (cache) {
                                let oldMessages = cloneDeep(this.state.oldMessages);
                                oldMessages[key] = cache.concat(oldMessages[key]);
                                this.setState({oldMessages: oldMessages});
                            }
                        });
                    }}
                    lastContactSelected = {(uri) => {
                        this.lastMessageFocus = uri;
                    }}
                    removeMessage = {(message) => {
                        messageStorage.removeMessage(message).then(()=> {
                            DEBUG('Message removed: %o', message.id);
                        });
                        let oldMessages = cloneDeep(this.state.oldMessages);
                        let contact = message.receiver;
                        if (message.state === 'received') {
                            contact = message.sender.uri;
                        }
                        this.state.account.removeMessage(message);
                        if (oldMessages[contact]) {
                            oldMessages[contact] = oldMessages[contact].filter(loadedMessage => loadedMessage.id !== message.id);
                        }
                        this.setState({oldMessages: oldMessages});
                    }}
                    isLoadingMessages = {this.state.messagesLoading}
                    sendPublicKey = {(uri) => {
                        storage.get('pgpKeys').then(pgpKeys => {
                            if (pgpKeys) {
                                this.state.account.sendMessage(uri, pgpKeys.publicKey, 'text/pgp-public-key');
                            }
                        });
                    }}

                />
            </div>
        )
    }

    conference() {
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
                roomMedia = {this.state.roomMedia}
                lowBandwidth = {this.state.lowBandwidth}
                setDevice = {this.setDevice}
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
                lowBandwidth = {this.state.lowBandwidth}
                getLocalMedia = {this.getLocalMediaGuestWrapper}
                setDevice = {this.setDevice}
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
                try {
                    this.state.connection.removeAccount(this.state.account,
                        (error) => {
                            if (error) {
                                DEBUG(error);
                            }
                        }
                    );
                } catch(error) {
                    DEBUG(error);
                }
            }
            if (this.shouldUseHashRouting) {
                storage.set('account', {accountId: this.state.accountId, password: ''});
                storage.remove('pgpKeys');
                storage.remove('lastMessageId');
            }
            messageStorage.close()

            if (this.state.connection.state !== 'ready') {
                this.state.connection.close();
            }
            this.setState({registrationState: null, status: null, serverHistory: [], oldMessages: {}});
            setImmediate(()=>this.setState({account: null}));
            this.isRetry = false;
            if (config.showGuestCompleteScreen && (this.state.mode === MODE_GUEST_CALL || this.state.mode === MODE_GUEST_CONFERENCE)) {
                this.refs.router.navigate('/call-complete');
            } else {
                this.refs.router.navigate('/login');
            }
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
