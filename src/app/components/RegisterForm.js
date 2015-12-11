'use strict';

const React      = require('react');
const sylkrtc    = require('sylkrtc');
const classNames = require('classnames');


let RegisterForm = React.createClass({
    propTypes: {
        handleRegistration: React.PropTypes.func.isRequired,
        registrationState: React.PropTypes.string
    },

    getInitialState: function() {
        return {
            accountId: '',
            password: '',
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
        if (registrationState === 'failed' || registrationState === null) {
            this.setState({registering: false});
        }
    },

    handleAccountIdChange: function(event) {
        this.setState({accountId: event.target.value});
    },

    handlePasswordChange: function(event) {
        this.setState({password: event.target.value});
    },

    handleSubmit: function(event) {
        event.preventDefault();
        this.setState({registering: true});
        this.props.handleRegistration(this.state.accountId, this.state.password);
    },

    render: function() {
        let validInput = this.state.accountId.indexOf('@') !== -1 && this.state.password !== 0;
        let classes = classNames({
            'capitalize' : true,
            'btn'        : true,
            'btn-lg'     : true,
            'btn-block'  : true,
            'btn-default': !validInput,
            'btn-primary': validInput && !this.state.registering,
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
                        <input type="email" id="inputUser" className="form-control" placeholder="Enter your SIP address" value={this.state.accountId} onChange={this.handleAccountIdChange} required autoFocus/>
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

module.exports = RegisterForm;
