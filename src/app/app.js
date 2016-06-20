'use strict';

const React     = require('react');
const ReactDOM  = require('react-dom');
const Router    = require('react-mini-router');
const navigate  = Router.navigate;
const sylkrtc   = require('sylkrtc');
const debug     = require('debug');

const RegisterBox       = require('./components/RegisterBox');
const ReadyBox          = require('./components/ReadyBox');
const Call              = require('./components/Call');
const CallByUriBox      = require('./components/CallByUriBox');
const AudioPlayer       = require('./components/AudioPlayer');
const ErrorPanel        = require('./components/ErrorPanel');
const FooterBox         = require('./components/FooterBox');
const StatusBox         = require('./components/StatusBox');
const AboutModal        = require('./components/AboutModal');
const IncomingCallModal = require('./components/IncomingModal');
const Notifications     = require('./components/Notifications');
const LoadingScreen     = require('./components/LoadingScreen');
const NavigationBar     = require('./components/NavigationBar');
const utils             = require('./utils');
const config            = require('./config');

// attach debugger to the window for console access
window.blinkDebugger = debug;

const DEBUG = debug('blinkrtc:App');


let Blink = React.createClass({
    mixins: [Router.RouterMixin],

    routes: {
        '/': 'main',
        '/login': 'login',
        '/logout': 'logout',
        '/ready': 'ready',
        '/call': 'call',
        '/call/:targetUri' : 'callByUri',
        '/not-supported': 'notSupported'
    },

    getInitialState: function() {
        return {
            accountId: '',
            password: '',
            account: null,
            registrationState: null,
            currentCall: null,
            connection: null,
            connectionState: null,
            inboundCall: null,
            showAboutModal: false,
            showIncomingModal: false,
            status: null,
            targetUri: '',
            loading: null,
            guestMode: false,
            callByUriState: null,
            localMedia: null,
            history: [],
            historyLoaded: false
        };
    },

    componentWillMount: function() {
        if (!sylkrtc.rtcninja.hasWebRTC()) {
            window.location.hash = '#!/not-supported';
        }
        // We wont hit any other path here, since other paths are handled by the webserver
        if(this.state.path === '/') {
            window.location.hash = '#!/login';
        }
    },

    shouldComponentUpdate: function (nextProps, nextState) {
        // This is used to catch location bar modifications, we only switch on nextProps
        if (this.state.path !== nextState.path) {
            if (!sylkrtc.rtcninja.hasWebRTC()) {
                navigate('/not-supported');
                return false;
            }

            if ((nextState.path === '/login' || nextState.path === '/') && this.state.registrationState === 'registered') {

                // Terminate the call if you modify the url you can only be in a call if you are registered
                if (this.state.currentCall !== null) {
                    this.state.currentCall.terminate();
                }
                navigate('/ready');
                return false ;
            } else if (nextState.path === '/call' && this.state.localMedia === null && this.state.registrationState === 'registered') {
                navigate('/ready')
                return false;
            } else if ((nextState.path === '/' || nextState.path === '/call' || nextState.path.startsWith('/ready')) && this.state.registrationState !== 'registered') {
                navigate('/login');
                return false;

            // Terminate call if we modify url from call -> ready, allow the transition
            } else if (nextState.path === '/ready' && this.state.path === '/call' && this.state.registrationState === 'registered') {
                if (this.state.currentCall !== null) {
                    this.state.currentCall.terminate();
                }
            }
        }
        return true;
    },

    connectionStateChanged: function(oldState, newState) {
        DEBUG('Connection state changed! ' + newState);
        switch (newState) {
            case 'closed':
                this.setState({connection: null, connectionState: newState});
                break;
            case 'ready':
                this.setState({connectionState: newState});
                this.processRegistration(this.state.accountId, this.state.password, this.state.guestMode);
                break;
            case 'disconnected':
                this.setState({account:null, registrationState: null, loading: 'Disconnected, reconnecting...', currentCall: null});
                break;
            default:
                this.setState({connectionState: newState, loading: 'Connecting...'});
                break;
        }
    },

    registrationStateChanged: function(oldState, newState, data) {
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
            this.refs.notifications.postNotification('success',this.state.accountId + ' signed in','Ready to receive calls');
            navigate('/ready');
            return;
        } else {
            this.setState({status: null });
        }
    },

    callStateChanged: function(oldState, newState, data) {
        DEBUG('Call state changed! ' + newState);

        if (newState === 'terminated') {
            let reason = data.reason;
            let callSuccesfull = false;
            if (reason.match(/200/)) {
                reason = 'Hangup';
                callSuccesfull = true;
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
            this.refs.notifications.postNotification('info', 'Call Terminated', reason);

            let targetUri = '';
            if (!callSuccesfull) {
                targetUri = this.state.targetUri;
            }

            this.setState({
                currentCall         : null,
                targetUri           : targetUri,
                showIncomingModal   : false,
                inboundCall         : null,
                localMedia          : null
            });

            if (callSuccesfull && this.state.callByUriState !== null) {
                this.state.connection.removeListener('stateChanged', this.connectionStateChanged);
                this.state.connection.close();
                let newState = this.getInitialState();
                newState.callByUriState = 'finished';
                this.setState(newState);
            } else if (this.state.callByUriState !== null) {
                this.state.connection.removeListener('stateChanged', this.connectionStateChanged);
                this.state.connection.close();
                let newState = this.getInitialState();
                newState.callByUriState = 'failed';
                this.setState(newState);
            } else {
                navigate('/ready');
            }
        }

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
                break;
            default:
                break;
        }
    },

    inboundCallStateChanged: function(oldState, newState, data) {
        DEBUG('Inbound Call state changed! ' + newState);
        if (newState === 'terminated') {
            this.setState({ inboundCall: null, showIncomingModal: false });
        }
    },

    handleCallByUri: function(accountId, targetUri) {
        this.setState({
            accountId      : accountId,
            password       : '',
            guestMode      : true,
            targetUri      : utils.normalizeUri(targetUri, config.defaultDomain),
            callByUriState : 'init',
            loading        : 'Connecting...'
        });

        if (this.state.connection === null) {
            let connection = sylkrtc.createConnection({server: config.wsServer});
            connection.on('stateChanged', this.connectionStateChanged);
            this.setState({connection: connection});
        } else {
            DEBUG('Connection Present, try to register');
            this.processRegistration(accountId, '', true);
        }
    },

    handleRegistration: function(accountId, password='', guestMode=false) {
        // Needed for ready event in connection
        this.setState({
            accountId : accountId,
            password  : password,
            guestMode : guestMode,
            loading   : 'Connecting...'
        });

        if (this.state.connection === null) {
            let connection = sylkrtc.createConnection({server: config.wsServer});
            connection.on('stateChanged', this.connectionStateChanged);
            this.setState({connection: connection});
        } else {
            DEBUG('Connection Present, try to register');
            this.processRegistration(accountId, password, guestMode);
        }
    },

    processRegistration: function(accountId, password, guestMode) {
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
        }

        let options = {account: accountId, password: password};
        let account = this.state.connection.addAccount(options, (error, account) => {
            if (!error) {
                this.loadCallHistory();
                account.on('outgoingCall', this.outgoingCall);
                if (!this.state.guestMode) {
                    account.on('registrationStateChanged', this.registrationStateChanged);
                    account.on('incomingCall', this.incomingCall);
                    account.on('missedCall', this.missedCall);
                    this.setState({account: account});
                    this.toggleRegister();
                } else {
                    this.setState({account: account, loading: null, registrationState: 'registered'});
                    this.refs.notifications.postNotification('success', accountId + ' signed in');
                    if (this.state.callByUriState === null) {
                        navigate('/ready');
                        return;
                    }
                    this.startVideoCall(this.state.targetUri);
                    return;
                }
            } else {
                DEBUG('Add account error: ' + error);
                this.setState({loading: null, status: {msg: error.message, level:'danger'}});
            }
        });
    },

    toggleRegister: function() {
        if (this.state.registrationState !== null) {
            if (this.state.guestMode) {
                this.setState({registrationState: null});
            } else {
                this.state.account.unregister();
            }
        } else {
            this.state.account.register();
            if (!this.state.guestMode) {
                window.localStorage.setItem('blinkAccount',
                                            JSON.stringify({accountId: this.state.accountId, password: this.state.password}));
            }
        }
    },

    getLocalMedia: function(mediaConstraints) {
        let self = this;
        this.loadScreenTimer = setTimeout(() => {
            this.setState({loading: 'Please allow access to your media devices'});
        }, 150);

        mediaConstraints = mediaConstraints || {audio:true, video:true };

        sylkrtc.rtcninja.getUserMedia(mediaConstraints, function(localStream) {
            clearTimeout(self.loadScreenTimer);
            self.setState({status: null, loading: null, localMedia: localStream});
            if (self.state.callByUriState === null) {
                navigate('/call');
            }
        }, this.userMediaFailed);
    },

    userMediaFailed: function() {
        clearTimeout(this.loadScreenTimer);
        this.refs.notifications.postNotification('error', 'Access to media failed', '', 10);
        this.setState({
            loading: null
        });
    },

    startAudioCall: function(targetUri) {
        this.setState({targetUri: targetUri});
        this.addCallHistoryEntry(targetUri);
        this.getLocalMedia({audio: true, video: false});
    },

    startVideoCall: function(targetUri) {
        this.setState({targetUri: targetUri});
        this.addCallHistoryEntry(targetUri);
        this.getLocalMedia({audio: true, video: true});
    },

    answerCall: function() {
        this.setState({ showIncomingModal: false });
        if (this.state.inboundCall !== this.state.currentCall) {
            this.switchToIncomingCall(this.state.inboundCall);
        } else {
            this.getLocalMedia(this.state.currentCall.mediaTypes);
        }
    },

    rejectCall: function() {
        this.setState({showIncomingModal: false});
        this.state.inboundCall.terminate();
    },

    outgoingCall: function(call) {
        call.on('stateChanged', this.callStateChanged);
        this.setState({currentCall: call});
    },

    incomingCall: function(call, mediaTypes) {
        DEBUG('New incoming call from %s with %o', call.remoteIdentity, mediaTypes);
        call.mediaTypes = mediaTypes;
        if (this.state.currentCall !== null) {
            // detect if we called ourselves
            if (this.state.currentCall.localIdentity.uri === this.state.currentCall.localIdentity.uri &&
                this.state.currentCall.localIdentity.uri === call.remoteIdentity.uri) {
                DEBUG('Aborting call to myself');
                call.terminate();
                return;
            }
            this.setState({ showIncomingModal: true, inboundCall: call });
            call.on('stateChanged', this.inboundCallStateChanged);
        } else {
            this.refs.audioPlayerInbound.play(true);
            call.on('stateChanged', this.callStateChanged);
            this.setState({currentCall: call, inboundCall: call, showIncomingModal: true});
        }
    },

    switchToMissedCall: function(targetUri) {
        if (this.state.currentCall !== null) {
            this.state.currentCall.removeListener('stateChanged', this.callStateChanged);
            this.setState({currentCall: null, targetUri: targetUri, showIncomingModal: false, localMedia: null});
            this.state.currentCall.terminate();
        } else {
            this.setState({targetUri: targetUri});
        }
        navigate('/ready');
    },

    switchToIncomingCall: function(call) {
        this.state.inboundCall.removeListener('stateChanged', this.inboundCallStateChanged);
        this.state.currentCall.removeListener('stateChanged', this.callStateChanged);
        this.state.currentCall.terminate();
        this.setState({currentCall: call, inboundCall: null, localMedia: null});
        call.on('stateChanged', this.callStateChanged);
        this.getLocalMedia(call.mediaTypes);
    },

    missedCall: function(data) {
        DEBUG('Missed call from ' + data.originator);
        this.refs.notifications.postMissedCall(data.originator, this.switchToMissedCall);
    },

    addCallHistoryEntry: function(uri) {
        if (!this.state.guestMode) {
            let history = this.state.history;
            let idx = history.indexOf(uri);
            if (idx !== -1) {
                history.splice(idx, 1);
            }
            history.unshift(uri);
            // keep just the last 50
            history = history.slice(0, 50);
            window.localStorage.setItem('blinkHistory', JSON.stringify(history));
            this.setState({history: history});
        }
    },

    loadCallHistory: function() {
        if (this.state.historyLoaded) {
            return this.state.history;
        } else {
            let history = [];
            if (!this.state.guestMode) {
                let data = window.localStorage.getItem('blinkHistory');
                if (data) {
                    history = JSON.parse(data);
                }
            }
            this.setState({history: history, historyLoaded: true});
        }
    },

    showAboutModal: function() {
        this.setState({showAboutModal: true});
    },

    closeAboutModal: function() {
        this.setState({showAboutModal: false});
    },

    render: function() {
        let loadingScreen;
        let footerBox = <FooterBox />;

        if (this.state.loading !== null) {
            loadingScreen = <LoadingScreen text={this.state.loading} />;
        }

        if (this.state.localMedia) {
                footerBox = '';
        }

        // Prevent call/ready screen when not registered

        if ((this.state.path.startsWith('/ready') || this.state.path === '/call') && this.state.registrationState !== 'registered') {
            navigate('/login');
            return (<div></div>);
        }

        const audioPlayers = (<div>
                            <AudioPlayer ref="audioPlayerInbound" sourceFile="assets/sounds/inbound_ringtone.wav" />
                            <AudioPlayer ref="audioPlayerOutbound" sourceFile="assets/sounds/outbound_ringtone.wav" />
                            <AudioPlayer ref="audioPlayerHangup" sourceFile="assets/sounds/hangup_tone.wav" />
                        </div>);

        return (
            <div>
                {this.renderCurrentRoute()}
                {loadingScreen}
                {footerBox}
                {audioPlayers}
                <Notifications ref="notifications" />
                <IncomingCallModal
                    call = {this.state.inboundCall}
                    show = {this.state.showIncomingModal}
                    onAnswer = {this.answerCall}
                    onHide = {this.rejectCall}
                />
                <AboutModal show={this.state.showAboutModal} close={this.closeAboutModal} />
            </div>
        );
    },

    notSupported: function() {
        let errorMsg = 'This app works only in a WebRTC browser (e.g. Chrome or Firefox)';
        return (
            <div>
                <ErrorPanel errorMsg={errorMsg} />
                <RegisterBox
                    registrationInProgress={false}
                    handleRegistration={() => {}}
                />
            </div>
        );
    },

    notFound: function(path) {
        let status = {
            title   : '404',
            message : 'Oops, the page your looking for can\'t found: ' + path,
            level   : 'danger',
            width   : 'large'
        }
        return <div><StatusBox {...status} /></div>;
    },

    ready: function() {
        return (
            <div>
                <NavigationBar
                    account={this.state.account}
                    guestMode={this.state.guestMode}
                    showAbout={this.showAboutModal}
                    notifications={this.refs.notifications}
                />
                <ReadyBox
                    account   = {this.state.account}
                    startAudioCall = {this.startAudioCall}
                    startVideoCall = {this.startVideoCall}
                    targetUri = {this.state.targetUri}
                    guestMode = {this.state.guestMode}
                    history = {this.state.history}
                />
            </div>
        );
    },

    call: function() {
        return (
                <Call
                    localMedia = {this.state.localMedia}
                    account = {this.state.account}
                    targetUri = {this.state.targetUri}
                    currentCall = {this.state.currentCall}
                />
        )
    },

    callByUri: function(targetUri) {
        return (
                <CallByUriBox
                    handleCallByUri = {this.handleCallByUri}
                    targetUri = {targetUri}
                    callByUriState = {this.state.callByUriState}
                    localMedia = {this.state.localMedia}
                    account = {this.state.account}
                    currentCall = {this.state.currentCall}
                />
        );
    },

    login: function() {
        let registerBox;
        let statusBox;

        if (this.state.status !== null) {
            statusBox = <StatusBox message={this.state.status.msg} level={this.state.status.level} />;
        }

        if (this.state.registrationState !== 'registered') {
            let registrationInProgress = this.state.registrationState !== null && this.state.registrationState !== 'failed';
            registerBox = (
                <RegisterBox
                    registrationInProgress = {registrationInProgress}
                    handleRegistration = {this.handleRegistration}
                />
            );
        }

        return (
            <div>
                {registerBox}
                {statusBox}
            </div>
        );
    },

    logout: function() {
        this.toggleRegister();
        navigate('/login');
        return <div></div>;
    },

    main: function() {
        return (
            <div></div>
        );
    }
});

ReactDOM.render((<Blink />), document.getElementById('app'));
