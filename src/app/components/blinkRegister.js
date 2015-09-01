'use strict';

import React from 'react';
import sylkrtc from 'sylkrtc';

const domain='@sip2sip.info';

var Register = React.createClass({
    getInitialState() {
        return {
            accountId: '',
            password: '',
            connectionState: null,
            registrationState: null,
            registering: false,
            retry: false,
        };
    },
    componentWillReceiveProps(nextProps) {
        var connState = nextProps.connectionState;
        if (connState !== null) {
            this.setState({connectionState: connState});
        }
        var registrationState = nextProps.registrationState;
        if (registrationState !== null) {
            this.setState({registrationState: registrationState});
        }
    },

    handleAccountIdChange(event) {
        this.setState({accountId: event.target.value});
        if (this.state.registrationState === 'failed') {
            this.setState({registering: false, retry: true});
        }
    },

    handlePasswordChange(event) {
        this.setState({password: event.target.value});
        if (this.state.registrationState === 'failed') {
            this.setState({registering: false, retry: true});
        }
    },

    handleSubmit(event) {
        event.preventDefault();
        this.setState({registering: true});
        this.props.handleRegistration(this.state.accountId+domain, this.state.password);
    },

    componentDidMount() {
        if (sylkrtc.isWebRTCSupported()) {
            this.setState({ isValid: true });
        } else {
            if (this.props.onError) {
                this.props.onError('Sorry, the application will not work on this browser. Please get a supported browser.');
            }
        }
    },

    render() {
        var classNames = require('classnames');
        let classes = classNames({
            'capitalize' : true,
            'btn'        : true,
            'btn-lg'     : true,
            'btn-block'  : true,
            'btn-default': !(this.state.password !== '' && this.state.accountId !== ''),
            'btn-primary': this.state.password !== '' && this.state.accountId !== '' && !this.state.registering,
            'btn-info'   : this.state.registering,
            'btn-success': this.state.registrationState === 'registered',
            // 'btn-danger' : this.state.registrationState === 'failed' && !this.state.retry
        });

        let defaultText = 'Sign In';
        // if (this.state.connectionState !== null && !this.state.retry){
        //     defaultText = this.state.connectionState;
        //     if (this.state.connectionState === 'ready' && this.state.registrationState !== null) {
        //         defaultText = this.state.registrationState;
        //     }
        // }
        return (
            <div className="cover-container">
                <div className="inner cover" >
                    <div className='blink_logo'></div>
                    <h1 className="cover-heading">Blink</h1>
                    <p className='lead'>Sign in with your SIP account</p>
                    <form className="form-signin" onSubmit={this.handleSubmit}>
                        <label htmlFor="inputEmail" className="sr-only">Sip Account</label>
                        <div className="input-group">
                            <input id="inputUser" className="form-control" placeholder="Username" value={this.state.accountId} onChange={this.handleAccountIdChange} required autofocus/>
                            <div className="input-group-addon domain">&#64;sip2sip.info</div>
                        </div>
                        <label htmlFor="inputPassword" className="sr-only">Password</label>
                        <input type="password" id="inputPassword" ref="pass" className="form-control" placeholder="Password"  value={this.state.password} onChange={this.handlePasswordChange} required />
                        <button type="submit" className={classes} disabled={this.state.registering}>{defaultText}</button>
                    </form>
                </div>
            </div>
        );
    }
});

module.exports = Register;
