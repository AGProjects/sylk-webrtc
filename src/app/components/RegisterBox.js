'use strict';

const React  = require('react');
const Toggle = require('react-toggle');

const GuestForm         = require('./GuestForm');
const RegisterForm      = require('./RegisterForm');
const Logo              = require('./Logo');


let RegisterBox = React.createClass({
    propTypes: {
        handleRegistration     : React.PropTypes.func.isRequired,
        registrationInProgress : React.PropTypes.bool
    },

    getInitialState: function() {
        return {
            guestMode: false
        };
    },

    handleGuestModeChange: function(event) {
        this.setState({guestMode: event.target.checked});
    },

    render: function() {
        let loginForm;
        let buttonText;

        if (this.state.guestMode) {
            loginForm = (
                <GuestForm
                    handleRegistration={this.props.handleRegistration}
                />
            );
            buttonText = 'Guest mode';
        } else {
            loginForm = (
                <RegisterForm
                    registrationInProgress={this.props.registrationInProgress}
                    handleRegistration={this.props.handleRegistration}
                />
            );
            buttonText = 'or sign in as guest';
        }

        return (
            <div className="cover-container">
                <div className="inner cover" >
                    <Logo />
                    {loginForm}
                    <div className="checkbox">
                        <form className="form-guest-switcher">
                            <label className="react-toggle-label">
                                {buttonText}
                                <Toggle defaultChecked={this.state.guestMode} onChange={this.handleGuestModeChange} />
                            </label>
                        </form>
                    </div>
                </div>
            </div>
        );
    }
});

module.exports = RegisterBox;
