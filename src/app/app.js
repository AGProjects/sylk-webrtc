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

// attach debugger to the window for console access
window.blinkDebugger = debug;

const DEBUG = debug('blinkrtc');


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
            status: null
        };
    },

    connectionStateChanged: function(oldState, newState) {
        switch (newState) {
            case 'closed':
                this.setState({connection: null, connectionState: newState});
                break;
            case 'ready':
                this.setState({connectionState: newState});
                this.handleRegistration(this.state.accountId, this.state.password);
                break;
            default:
                this.setState({connectionState: newState});
                break;
        }
    },

    registrationStateChanged: function(oldState, newState) {
        DEBUG('Registration state changed! ' + newState);
        this.setState({registrationState: newState});
        if (newState === 'failed') {
            this.setState({accountId:null, password:null});
            this.setState({status: {msg: 'Sign In failed', lvl:'danger'} });
        } else if (newState === 'registered') {
            this.refs.notifications.postNotification('success','Account signed in','Ready to received calls');
        } else {
            this.setState({status: null });
        }
    },

    callStateChanged: function(oldState, newState, data) {
        // if (!this.isMounted()) {
        //     // we might get here when the component has been unmounted
        //     return;
        // }
        DEBUG('Call state changed! ' + newState);
        this.setState({callState: newState});
        if (newState === 'terminated') {
            this.refs.notifications.postNotification('info', 'Call Terminated', data.reason);
            this.setState({currentCall: null, callState: null, targetUri: '', smShow: false});
        }
    },

    handleConnect: function(accountId, pass) {
        // Needed for ready event in connection
        this.setState({accountId:accountId});
        this.setState({password:pass});

        if (this.state.connection === null) {
            let connection = sylkrtc.createConnection({server: this.state.server});
            connection.on('stateChanged', this.connectionStateChanged);
            this.setState({connection: connection});
        } else {
            DEBUG('Connection Present, try to reregister');
            this.handleRegistration(accountId, pass);
        }
    },

    handleRegistration: function(accountId,password) {
        let self = this;
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
                self.setState({account: account});
                self.toggleRegister();
            } else {
                DEBUG(error);
                self.gotError(error);
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

    incomingCall: function(call){
        DEBUG('New ' + call.direction + ' call');
        if (this.state.currentCall !== null) {
            call.terminate();
        } else {
            this.setState({ smShow: true });
            call.on('stateChanged', this.callStateChanged);
            this.setState({currentCall: call});
        }
    },

    gotError: function(errorMsg) {
        this.setState({ error: errorMsg });
    },

    render: function() {
        let registerBox;
        let statusBox;
        let callBox;
        let videoBox;
        let audioPlayer;
        let errorPanel;
        let footerBox;
        let call = this.state.currentCall;
        let smClose = e => this.setState({smShow: false});

        if (this.state.error !== null ) {
            errorPanel = <ErrorPanel show={true} onHide={smClose} errorMsg={this.state.error} />
        }

        if (this.state.status !== null ) {
            statusBox = <StatusBox message={this.state.status.msg} level={this.state.status.lvl} />;
        }

        if (this.state.registrationState !== 'registered') {
            registerBox = <RegisterBox
                registrationState  = {this.state.registrationState}
                handleRegistration = {this.handleConnect}
                onError            = {this.gotError} />;
        } else {
            if (call !== null && (call.state === 'progress' ||  call.state === 'accepted' ||  call.state === 'established')) {
                if (call.state === 'progress') {
                    audioPlayer = <AudioPlayer direction={call.direction} />
                }
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
                {registerBox}
                {callBox}
                {videoBox}
                {audioPlayer}
                {statusBox}
                {footerBox}
                <Notifications ref='notifications' />
                <IncomingCallModal call={this.state.currentCall} show={this.state.smShow} onAnswer={this.answerCall} onHide={smClose} />
            </div>
        );
    }
});

React.render((<Blink />), document.getElementById('app'));
