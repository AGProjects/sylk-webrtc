'use strict';

const React      = require('react');
const sylkrtc    = require('sylkrtc');
const classNames = require('classnames');

const defaultDomain = 'sip2sip.info';


let RegisterBox = React.createClass({
    propTypes: {
        handleRegistration: React.PropTypes.func.isRequired
    },

    getInitialState: function() {
        return {
            accountId: '',
            password: '',
            registrationState: null,
            registering: false
        };
    },

    componentWillMount: function() {
        let data = window.localStorage.getItem('blinkAccount');
        if (data) {
            let accountData = JSON.parse(data);
            this.setState(accountData);
        }
    },

    componentWillReceiveProps: function(nextProps) {
        let registrationState = nextProps.registrationState;
        if (registrationState !== null) {
            this.setState({registrationState: registrationState});
        }
    },

    resetSignInButton: function() {
        if (this.state.registrationState === 'failed' || this.state.registrationState === null) {
            this.setState({registering: false});
        }
    },

    handleAccountIdChange: function(event) {
        this.setState({accountId: event.target.value});
        this.resetSignInButton();
    },

    handlePasswordChange: function(event) {
        this.setState({password: event.target.value});
        this.resetSignInButton();
    },

    handleSubmit: function(event) {
        event.preventDefault();
        this.setState({registering: true});
        let accountId = this.state.accountId;
        if (this.state.accountId.indexOf('@') === -1) {
             // take the domain part from the default
            accountId = this.state.accountId + '@' + defaultDomain;
        }
        this.props.handleRegistration(accountId, this.state.password);
    },

    render: function() {
        let classes = classNames({
            'capitalize' : true,
            'btn'        : true,
            'btn-lg'     : true,
            'btn-block'  : true,
            'btn-default': !(this.state.password !== '' && this.state.accountId !== ''),
            'btn-primary': this.state.password !== '' && this.state.accountId !== '' && !this.state.registering,
            'btn-info'   : this.state.registering,
            'btn-success': this.state.registrationState === 'registered'
        });

        return (
            <div>
                <p className="lead">Sign in to continue</p>
                <form className="form-signin" onSubmit={this.handleSubmit}>
                    <label htmlFor="inputEmail" className="sr-only">Sip Account</label>
                    <div className="input-group">
                        <span className="input-group-addon first"><i className="fa fa-globe fa-fw"></i></span>
                        <input id="inputUser" className="form-control" placeholder="Enter your SIP address" value={this.state.accountId} onChange={this.handleAccountIdChange} required autoFocus/>
                    </div>
                    <label htmlFor="inputPassword" className="sr-only">Password</label>
                    <div className="input-group">
                        <span className="input-group-addon second"><i className="fa fa-lock fa-fw"></i></span>
                        <input type="password" id="inputPassword" ref="pass" className="form-control" placeholder="Password" value={this.state.password} onChange={this.handlePasswordChange} required />
                    </div>
                    <button type="submit" className={classes} disabled={this.state.registering}>Sign In</button>
                </form>
                <p>No SIP account? <a href="http://sip2sip.info" target="_new">Create an account</a></p>
            </div>
        );
    }
});

module.exports = RegisterBox;
