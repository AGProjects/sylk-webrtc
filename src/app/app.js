'use strict';

const React     = require('react');
const ReactDOM  = require('react-dom');
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
            error: null,
            status: null,
            targetUri: '',
            loading: false,
            guestMode: false,
            localMedia: null
        };
    },

    componentWillMount: function() {
        if (!sylkrtc.rtcninja.hasWebRTC()) {
            let errorMsg = 'This app works only in a WebRTC browser (e.g. Chrome or Firefox)';
            this.setState({ error: errorMsg });
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
                if (!this.state.guestMode) {
                     this.handleRegistration(this.state.accountId, this.state.password);
                } else {
                    this.handleGuestRegistration(this.state.accountId);
                }
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
        } else {
            this.setState({status: null });
        }
    },

    callStateChanged: function(oldState, newState, data) {
        DEBUG('Call state changed! ' + newState);
        this.setState({callState: newState});

        if (newState === 'terminated') {
            this.refs.notifications.postNotification('info', 'Call Terminated', data.reason);
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

    handleConnect: function(accountId, pass) {
        // Needed for ready event in connection
        this.setState({accountId:accountId, password:pass, loading: true});

        if (this.state.connection === null) {
            let connection = sylkrtc.createConnection({server: config.wsServer});
            connection.on('stateChanged', this.connectionStateChanged);
            this.setState({connection: connection});
        } else {
            DEBUG('Connection Present, try to register');
            if (!this.state.guestMode) {
                this.handleRegistration(accountId, pass);
            } else {
                this.handleGuestRegistration(accountId);
            }
        }
    },

    handleRegistration: function(accountId, password) {
        const self = this;
        if (this.state.account !== null) {
            DEBUG('We already have an account, removing it');
            this.state.connection.removeAccount(this.state.account,
                function(error) {
                    if (error) {
                        DEBUG(error);
                    }
                    self.setState({account: null, registrationState: null});
                }
            );
        }

        let options = {account: accountId, password: password};
        let account = this.state.connection.addAccount(options, function(error,account) {
            if (!error) {
                account.on('registrationStateChanged', self.registrationStateChanged);
                account.on('incomingCall', self.incomingCall);
                account.on('missedCall', self.missedCall);
                self.setState({account: account});
                self.toggleRegister();
            } else {
                DEBUG('Add account error: ' + error);
                self.setState({loading: false, status: {msg: error.message, level:'danger'}});
            }
        });
    },

    handleGuestRegistration: function(accountId) {
        const self = this;
        if (this.state.account !== null) {
            DEBUG('We already have an account, removing it');
            this.state.connection.removeAccount(this.state.account,
                function(error) {
                    if (error) {
                        DEBUG(error);
                    }
                    self.setState({account: null, registrationState: null});
                }
            );
        }

        let options = {account: accountId, password: ''};
        let account = this.state.connection.addAccount(options, function(error,account) {
            if (!error) {
                self.setState({account: account, password: '', loading: false, registrationState: 'registered'});
                self.refs.notifications.postNotification('success', accountId + ' signed in');
            } else {
                DEBUG('Add account error: ' + error);
                self.setState({loading: false, status: {msg: error.message, level:'danger'}});
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
            window.localStorage.setItem('blinkAccount',
                                        JSON.stringify({accountId: this.state.accountId, password: this.state.password}));
        }
    },

    switchGuestMode: function(state) {
        this.setState({guestMode: state, status: null});
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
        this.getLocalMedia(targetUri,{audio: true, video: false});
    },

    startVideoCall: function(targetUri) {
        this.setState({callState: 'init'});
        this.getLocalMedia(targetUri, {audio: true, video: true});
    },

    startCall: function(targetUri, localStream) {
        assert(this.state.currentCall == null, 'currentCall is not null');
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

    render: function() {
        let registerBox;
        let statusBox;
        let callBox;
        let videoBox;
        let errorPanel;
        let footerBox;
        let audioPlayers;
        let loadingScreen;
        let call = this.state.currentCall;

        if (this.state.error !== null) {
            errorPanel = <ErrorPanel errorMsg={this.state.error} />;
        }

        if (this.state.status !== null) {
            statusBox = <StatusBox message={this.state.status.msg} level={this.state.status.level} />;
        }

        if (this.state.loading) {
            loadingScreen = <LoadingScreen/>;
        }

        if (this.state.registrationState !== 'registered') {
            registerBox = (
                <RegisterBox
                    registrationState  = {this.state.registrationState}
                    handleRegistration = {this.handleConnect}
                    switchGuestMode = {this.switchGuestMode}
                    guestMode = {this.state.guestMode}
                />
            );
        } else {
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
                            signOut = {this.toggleRegister}
                            targetUri = {this.state.targetUri}
                            guestMode = {this.state.guestMode}
                            callState = {this.state.callState}
                        />
                    );
                }
            }
        }

        if (!videoBox) {
            footerBox = <FooterBox />;
        }

        return (
            <div>
                {errorPanel}
                {loadingScreen}
                {registerBox}
                {callBox}
                {videoBox}
                {audioPlayers}
                {statusBox}
                {footerBox}
                <Notifications ref="notifications" />
                <IncomingCallModal
                    show={this.state.showIncomingModal}
                    call={this.state.inboundCall}
                    onAnswer={this.answerCall}
                    onHide={this.rejectCall}
                />
            </div>
        );
    }
});

ReactDOM.render((<Blink />), document.getElementById('app'));
