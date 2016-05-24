'use strict';

const React     = require('react');
const ReactDOM  = require('react-dom');
const Router    = require('react-mini-router');
const navigate  = Router.navigate;
const sylkrtc   = require('sylkrtc');
const assert    = require('assert');
const debug     = require('debug');

const RegisterBox       = require('./components/RegisterBox');
const CallBox           = require('./components/CallBox');
const VideoBox          = require('./components/VideoBox');
const AudioPlayer       = require('./components/AudioPlayer');
const ErrorPanel        = require('./components/ErrorPanel');
const FooterBox         = require('./components/FooterBox');
const StatusBox         = require('./components/StatusBox');
const IncomingCallModal = require('./components/IncomingModal');
const Notifications     = require('./components/Notifications');
const LoadingScreen     = require('./components/LoadingScreen');
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
        '/call': 'call',
        '/not-supported': 'notSupported'
    },

    getInitialState: function() {
        return {
            accountId: '',
            password: '',
            account: null,
            registrationState: null,
            currentCall: null,
            callState: '',
            connection: null,
            connectionState: null,
            inboundCall: null,
            showIncomingModal: false,
            status: null,
            targetUri: '',
            loading: false,
            guestMode: false,
            localMedia: null,
            history: []
        };
    },

    componentWillMount: function() {
        if (!sylkrtc.rtcninja.hasWebRTC()) {
            window.location.hash = '#!/not-supported';
        }
        if(this.state.path === '/') {
            window.location.hash = '#!/login';
        }
        // load call history
        this.loadCallHistory();
    },

    componentWillUpdate: function(nextProps, nextState) {
        // This id used to catch location bar modifications, we only switch on nextProps
        if (this.state.path !== nextState.path) {
            if (!sylkrtc.rtcninja.hasWebRTC()) {
                navigate('/not-supported');
                return;
            }

            if ((nextState.path === '/login' || nextState.path === '/') && this.state.registrationState === 'registered') {

                // Terminate the call if you modify the url you can only be in a call if you are registered
                if (this.state.currentCall !== null) {
                    this.state.currentCall.terminate();
                }

                navigate('/call');
                return;
            } else if (nextState.path === '/' && this.state.registrationState !== 'registered') {
                navigate('/login');
                return;
            }
        }
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
                this.setState({account:null, registrationState: null, loading: true, currentCall: null});
                break;
            default:
                this.setState({connectionState: newState, loading: true});
                break;
        }
    },

    registrationStateChanged: function(oldState, newState, data) {
        DEBUG('Registration state changed! ' + newState);
        this.setState({registrationState: newState});
        if (newState === 'failed') {
            this.setState({
                loading     : false,
                status      : {
                    msg   : 'Sign In failed: ' + data.reason,
                    level : 'danger'
                }
            });
        } else if (newState === 'registered') {
            this.setState({loading: false});
            this.refs.notifications.postNotification('success',this.state.accountId + ' signed in','Ready to receive calls');
            navigate('/call');
            return;
        } else {
            this.setState({status: null });
        }
    },

    callStateChanged: function(oldState, newState, data) {
        DEBUG('Call state changed! ' + newState);
        this.setState({callState: newState});

        if (newState === 'terminated') {
            let reason = data.reason;
            if (reason.match(/200/)) {
                reason = 'Hangup';
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
            this.setState({
                currentCall         : null,
                callState           : null,
                targetUri           : '',
                showIncomingModal   : false,
                inboundCall         : null,
                localMedia          : null
            });
        }

        if (newState === 'progress') {
            this.refs.audioPlayerOutbound.play(true);
        } else if (newState === 'accepted') {
            this.refs.audioPlayerOutbound.stop();
            this.refs.audioPlayerInbound.stop();
        } else if ((oldState === 'progress' || oldState === 'incoming' || oldState === 'established') && newState === 'terminated') {
            this.refs.audioPlayerOutbound.stop();
            this.refs.audioPlayerInbound.stop();
            this.refs.audioPlayerHangup.play();
        }
    },

    inboundCallStateChanged: function(oldState, newState, data) {
        DEBUG('Inbound Call state changed! ' + newState);
        if (newState === 'terminated') {
            this.setState({ inboundCall: null, showIncomingModal: false });
        }
    },

    handleRegistration: function(accountId, password='', guestMode=false) {
        // Needed for ready event in connection
        this.setState({
            accountId:accountId,
            password:password,
            guestMode: guestMode,
            loading: true
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
                if (!this.state.guestMode) {
                    account.on('registrationStateChanged', this.registrationStateChanged);
                    account.on('incomingCall', this.incomingCall);
                    account.on('missedCall', this.missedCall);
                    this.setState({account: account});
                    this.toggleRegister();
                } else {
                    this.setState({account: account, loading: false, registrationState: 'registered'});
                    this.refs.notifications.postNotification('success', accountId + ' signed in');
                    navigate('/call');
                    return;
                }
            } else {
                DEBUG('Add account error: ' + error);
                this.setState({loading: false, status: {msg: error.message, level:'danger'}});
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

    armMediaTimer: function() {
        clearTimeout(this.statusTimer);
        this.mediaTimer = setTimeout(() => {
            this.setState({status : { msg: 'Please allow access to your media devices', level: 'info'}});
        }, 5000);
    },

    getLocalMedia: function(targetUri, mediaConstraints) {
        let self = this;
        this.mediaTimer = null;
        mediaConstraints = mediaConstraints || {audio:true, video:true };
        sylkrtc.rtcninja.getUserMedia(mediaConstraints, function(localStream) {
            clearTimeout(self.mediaTimer);
            self.setState({status: null, localMedia: localStream});
            // Assumes when state.currentCall is present, we need to answer
            if (self.state.currentCall !== null) {
                let options = {pcConfig: {iceServers: config.iceServers}};
                options.localStream = localStream;
                self.state.currentCall.answer(options);
            } else {
                self.startCall(targetUri, localStream);
            }
        }, this.userMediaFailed);
        this.armMediaTimer();
    },

    userMediaFailed: function() {
        clearTimeout(this.mediaTimer);
        this.refs.notifications.postNotification('error', 'Access to media failed', '', 10);
        this.setState({
            status    : null,
            callState : null,
            targetUri : ''
        });
    },

    startAudioCall: function(targetUri) {
        this.setState({callState: 'init'});
        this.addCallHistoryEntry(targetUri);
        this.getLocalMedia(targetUri,{audio: true, video: false});
    },

    startVideoCall: function(targetUri) {
        this.setState({callState: 'init'});
        this.addCallHistoryEntry(targetUri);
        this.getLocalMedia(targetUri, {audio: true, video: true});
    },

    startCall: function(targetUri, localStream) {
        assert(this.state.currentCall == null, 'currentCall is not null');
        this.addCallHistoryEntry(targetUri);
        let options = {pcConfig: {iceServers: config.iceServers}};
        options.localStream = localStream;
        let call = this.state.account.call(targetUri, options);
        call.on('stateChanged', this.callStateChanged);
        this.setState({currentCall: call, targetUri:''});
    },

    answerCall: function() {
        this.setState({ showIncomingModal: false });
        if (this.state.inboundCall !== this.state.currentCall) {
            this.switchToIncomingCall(this.state.inboundCall);
        } else {
            this.getLocalMedia('',this.state.currentCall.mediaTypes);
        }
    },

    rejectCall: function() {
        this.setState({showIncomingModal: false});
        this.state.inboundCall.terminate();
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
            this.setState({currentCall: null, callState: null, targetUri: targetUri, showIncomingModal: false, localMedia: null});
            this.state.currentCall.terminate();
        } else {
            this.setState({ targetUri: targetUri});
        }
    },

    switchToIncomingCall: function(call) {
        this.state.inboundCall.removeListener('stateChanged', this.inboundCallStateChanged);
        this.state.currentCall.removeListener('stateChanged', this.callStateChanged);
        this.state.currentCall.terminate();
        this.setState({currentCall: call, callState: call.state, inboundCall: null, localMedia: null});
        call.on('stateChanged', this.callStateChanged);
        this.getLocalMedia('',call.mediaTypes);
    },

    missedCall: function(data) {
        DEBUG('Missed call from ' + data.originator);
        this.refs.notifications.postMissedCall(data.originator, this.switchToMissedCall);
    },

    addCallHistoryEntry: function(uri) {
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
    },

    loadCallHistory: function() {
        let data = window.localStorage.getItem('blinkHistory');
        if (data) {
            let history = JSON.parse(data);
            this.setState({history: history});
        }
    },

    render: function() {
        let loadingScreen;
        let footerBox = <FooterBox />;

        if (this.state.loading) {
            loadingScreen = <LoadingScreen/>;
        }

        if (this.state.localMedia) {
            if (this.state.localMedia.getVideoTracks().length === 1) {
                footerBox = '';
            }
        }

        // Prevent call screen when not registered

        if (this.state.path === '/call' && this.state.registrationState !== 'registered') {
            navigate('/login');
            return (<div></div>);
        }

        return (
            <div>
            {this.renderCurrentRoute()}
            {loadingScreen}
            {footerBox}
            <Notifications ref="notifications" />
            <IncomingCallModal call={this.state.inboundCall} show={this.state.showIncomingModal} onAnswer={this.answerCall} onHide={this.rejectCall} />
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
            title : '404',
            message : 'Oops, the page your looking for can\'t found: ' + path,
            level : 'danger',
            width: 'large'
        }
        return <div><StatusBox {...status} /></div>;
    },

    call: function() {
        let statusBox;
        let callBox;
        let videoBox;
        let audioPlayers;

        if (this.state.status !== null) {
            statusBox = <StatusBox message={this.state.status.msg} level={this.state.status.level} />;
        }

        audioPlayers = (<div>
                            <AudioPlayer ref="audioPlayerInbound" sourceFile="assets/sounds/inbound_ringtone.wav"/>
                            <AudioPlayer ref="audioPlayerOutbound" sourceFile="assets/sounds/outbound_ringtone.wav"/>
                            <AudioPlayer ref="audioPlayerHangup" sourceFile="assets/sounds/hangup_tone.wav" />
                        </div>);
        if (this.state.localMedia !== null) {
            videoBox = <VideoBox call={this.state.currentCall} localMedia={this.state.localMedia}/>;
        } else {
            if (this.state.status === null) {
                callBox = (
                    <CallBox
                        account   = {this.state.account}
                        startAudioCall = {this.startAudioCall}
                        startVideoCall = {this.startVideoCall}
                        targetUri = {this.state.targetUri}
                        guestMode = {this.state.guestMode}
                        callState = {this.state.callState}
                        history = {this.state.history}
                    />
                );
            }
        }

        return (
            <div>
                {callBox}
                {videoBox}
                {audioPlayers}
                {statusBox}
            </div>
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
