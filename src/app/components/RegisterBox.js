'use strict';

const React  = require('react');
const Toggle = require('react-toggle');

const GuestForm         = require('./GuestForm');
const RegisterForm      = require('./RegisterForm');
const Logo              = require('./Logo');


let RegisterBox = React.createClass({
    propTypes: {
        guestMode              : React.PropTypes.bool.isRequired,
        switchGuestMode        : React.PropTypes.func,
        handleRegistration     : React.PropTypes.func,
        registrationInProgress : React.PropTypes.bool
    },

    handleGuestModeChange: function(event) {
        this.props.switchGuestMode(event.target.checked);
    },

    render: function() {
        let loginForm;

        let buttonText = 'or sign in as guest';

        if (this.props.guestMode) {
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
                                <Toggle defaultChecked={this.props.guestMode} onChange={this.handleGuestModeChange} />
                            </label>
                        </form>
                    </div>
                </div>
            </div>
        );
    }
});

module.exports = RegisterBox;
