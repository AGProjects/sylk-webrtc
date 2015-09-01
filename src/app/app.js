'use strict';

import React from 'react';
import sylkrtc from 'sylkrtc';

import Register from './components/blinkRegister.js';
import Idle from './components/blinkCall.js';
import Video from './components/blinkVideo.js';
import AudioPlayer from './components/blinkAudioPlayer.js';
import ErrorPanel from './components/blinkError.js';
import StatusBox from './components/blinkStatus.js';
import IncomingCallModal from './components/blinkIncomingModal.js';
import Notifications from './components/blinkNotifications.js';

import debug from 'debug';

// attach debugger to the window for console access
window.blinkDebugger = debug;
const DEBUG = debug('blinkrtc');

let Blink = React.createClass({
    getInitialState() {
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

    connectionStateChanged(oldState, newState) {
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

    registrationStateChanged(oldState, newState) {
        DEBUG('Registration state changed! ' + newState);
        this.setState({registrationState: newState});
        if (newState === 'failed') {
            this.setState({accountId:null, password:null});
            this.setState({status: {msg: 'Sign In failed', lvl:'danger'} });
        } else if (newState === 'registered') {
            this.refs.notifications.postNotification('success','Registered','Account has been registered');
        } else {
            this.setState({status: null });
        }
    },

    callStateChanged(oldState, newState, data) {
        // if (!this.isMounted()) {
        //     // we might get here when the component has been unmounted
        //     return;
        // }
        DEBUG('Call state changed! ' + newState);
        this.setState({callState: newState});
        if (newState === 'terminated') {
            this.refs.notifications.postNotification('info','',data);
            //this.setState({status: {msg: data, lvl:'warning'} });
            this.setState({currentCall: null, callState: null, targetUri: '', smShow: false});
        }
    },

    handleConnect(accountId, pass) {
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

    handleRegistration(accountId,password) {
        let self = this;
        if (this.state.account !== null) {
            DEBUG('We already have an account, removing it');
            this.state.connection.removeAccount(this.state.account, function(error) {
                if (error) {
                    DEBUG(error);
                }
                self.setState({account: null, registrationState: null});
            });
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

    toggleRegister() {
        if (this.state.registrationState !== null) {
            this.state.account.unregister();
        } else {
            this.state.account.register();
        }
    },

    startCall(targetUri) {
        if (this.state.currentCall === null) {
            let call = this.state.account.call(targetUri, this.state.callOtions);
            call.on('stateChanged', this.callStateChanged);
            this.setState({currentCall: call});
        }
    },

    answerCall(){
        this.setState({ smShow: false });
        this.state.currentCall.answer(this.state.callOptions);
    },

    incomingCall(call){
        DEBUG('New ' + call.direction + ' call');
        if (this.state.currentCall !== null) {
            call.terminate();
        } else {
            this.setState({ smShow: true });
            call.on('stateChanged', this.callStateChanged);
            this.setState({currentCall: call});
        }
    },

    gotError(errorMsg) {
        this.setState({ error: errorMsg });
    },

    componentDidMount() {
        //if (sylkrtc.isWebRTCSupported())
            //this.handleConnect();
    },

    render() {
        let register,
            status,
            idle,
            video,
            audioPlayer,
            error;
        let call = this.state.currentCall;
        let smClose = e => this.setState({smShow: false});

        if (this.state.error !== null ) {
            error = <ErrorPanel show={true} onHide={smClose} errorMsg={this.state.error} />
        }

        if (this.state.status !== null ) {
            status = <StatusBox message={this.state.status.msg} level={this.state.status.lvl} />;
        }

        if (this.state.registrationState !== 'registered') {
            register = <Register
                connectionState    = {this.state.connectionState}
                registrationState  = {this.state.registrationState}
                handleRegistration = {this.handleConnect}
                onError            = {this.gotError} />;
            idle = '';
        } else {
            if (call !== null && (call.state === 'progress' ||  call.state === 'accepted' ||  call.state === 'established')) {
                if (call.state === 'progress') {
                    audioPlayer = <AudioPlayer direction={call.direction} />
                }
                video = <Video call={this.state.currentCall} />;
                idle = '';
            } else {
                audioPlayer = '';
                idle = <Idle
                    account   = {this.state.account}
                    startCall = {this.startCall}
                    signOut = {this.toggleRegister}/>;
            }
        }
        return (
            <div>
                {error}
                {register}
                {idle}
                {video}
                {audioPlayer}
                {status}
                <Notifications ref='notifications' />
                <IncomingCallModal call={this.state.currentCall} show={this.state.smShow} onAnswer={this.answerCall} onHide={smClose} />
            </div>
        );
    }
});

React.render((<Blink />
), document.getElementById('app'));
