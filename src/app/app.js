'use strict';

const React   = require('react');
const sylkrtc = require('sylkrtc');
const debug   = require('debug');

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
            server: 'wss://webrtc-gateway.sipthor.net:8888/webrtcgateway/ws',
            callOptions: {pcConfig: {iceServers: [{urls: 'stun:stun.l.google.com:19302'}]}},
            connection: null,
            connectionState: null,
            smShow: false,
            error: null,
            status: null,
            loading: false,
        };
    },

    componentWillMount: function(){
        if (!sylkrtc.rtcninja.hasWebRTC()) {
            let errorMsg = 'This app works in a WebRTC browser (e.g. Chrome or Firefox) on Mac & Windows.';
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
                this.handleRegistration(this.state.accountId, this.state.password);
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
                accountId   : null,
                password    : null,
                status      : {
                    msg: 'Sign In failed: ' + data.reason,
                    lvl:'danger'
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
            this.setState({currentCall: null, callState: null, targetUri: '', smShow: false});
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

    handleConnect: function(accountId, pass) {
        // Needed for ready event in connection
        this.setState({accountId:accountId, password:pass, loading: true});

        if (this.state.connection === null) {
            let connection = sylkrtc.createConnection({server: this.state.server});
            connection.on('stateChanged', this.connectionStateChanged);
            this.setState({connection: connection});
        } else {
            DEBUG('Connection Present, try to reregister');
            this.handleRegistration(accountId, pass);
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
                self.setState({loading: false, status: {msg: error.message, lvl:'danger'}});
            }
        });
    },

    toggleRegister: function() {
        if (this.state.registrationState !== null) {
            this.state.account.unregister();
        } else {
            this.state.account.register();
        }
    },

    startCall: function(targetUri, audioOnly=false) {
        if (this.state.currentCall === null) {
            let options = Object.create(this.state.callOptions);
            if (audioOnly) {
                options.mediaConstraints = {audio: true, video: false};
            } else {
                options.mediaConstraints = {audio: true, video: true};
            }
            let call = this.state.account.call(targetUri, options);
            call.on('stateChanged', this.callStateChanged);
            this.setState({currentCall: call});
        }
    },

    answerCall: function(){
        this.setState({ smShow: false });
        this.state.currentCall.answer(this.state.callOptions);
    },

    rejectCall: function() {
        this.state.currentCall.terminate();
        this.setState({smShow: false});
    },

    incomingCall: function(call, mediaTypes) {
        DEBUG('New incoming call from %s with %o', call.remoteIdentity, mediaTypes);
        if (this.state.currentCall !== null) {
            call.terminate();
        } else {
            this.refs.audioPlayerInbound.play(true);
            call.on('stateChanged', this.callStateChanged);
            this.setState({currentCall: call, smShow: true});
        }
    },

    missedCall: function(data) {
        DEBUG('Missed call from ' + data.originator);
        // TODO: notification
    },

    render: function() {
        let registerBox;
        let statusBox;
        let callBox;
        let videoBox;
        let errorPanel;
        let footerBox;
        let audioPlayerHangup, audioPlayerInbound, audioPlayerOutbound;
        let call = this.state.currentCall;

        if (this.state.error !== null ) {
            errorPanel = <ErrorPanel errorMsg={this.state.error} />
        }

        if (this.state.status !== null ) {
            statusBox = <StatusBox message={this.state.status.msg} level={this.state.status.lvl} />;
        }

        let loadingScreen;
        if (this.state.loading) {
            loadingScreen = <LoadingScreen/>;
        }

        if (this.state.registrationState !== 'registered') {
            registerBox = <RegisterBox
                registrationState  = {this.state.registrationState}
                handleRegistration = {this.handleConnect} />;
        } else {
            audioPlayerInbound = <AudioPlayer ref='audioPlayerInbound' source_file='assets/sounds/inbound_ringtone.wav'/>;
            audioPlayerOutbound = <AudioPlayer ref='audioPlayerOutbound' source_file='assets/sounds/outbound_ringtone.wav'/>;
            audioPlayerHangup = <AudioPlayer ref='audioPlayerHangup' source_file='assets/sounds/hangup_tone.wav'/>;
            if (call !== null && (call.state === 'progress' ||  call.state === 'accepted' ||  call.state === 'established')) {
                videoBox = <VideoBox call={this.state.currentCall} />;
            } else {
                callBox = <CallBox
                    account   = {this.state.account}
                    startCall = {this.startCall}
                    signOut = {this.toggleRegister}/>;
            }
        }

        if(!videoBox) {
            footerBox = <FooterBox />;
        }
        return (
            <div>
                {errorPanel}
                {loadingScreen}
                {registerBox}
                {callBox}
                {videoBox}
                {audioPlayerHangup}
                {audioPlayerOutbound}
                {audioPlayerInbound}
                {statusBox}
                {footerBox}
                <Notifications ref='notifications' />
                <IncomingCallModal call={this.state.currentCall} show={this.state.smShow} onAnswer={this.answerCall} onHide={this.rejectCall} />
            </div>
        );
    }
});

React.render((<Blink />), document.getElementById('app'));
