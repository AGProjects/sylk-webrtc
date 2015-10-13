'use strict';

const React  = require('react');
const Toggle = require('react-toggle');

const GuestForm         = require('./GuestForm.js');
const RegisterForm      = require('./RegisterForm.js');

let RegisterBox = React.createClass({

    handleGuestModeChange: function(event) {
        this.props.switchGuestMode(event.target.checked);
    },

    render: function() {

        let guestForm;
        let registerForm;
        let buttonText = 'or sign in as guest';

        if (this.props.guestMode) {
            guestForm = <GuestForm  {...this.props}/>;
            buttonText = 'Guest mode';
        } else {
            registerForm = <RegisterForm {...this.props}/>;
        }

        return (
            <div className="cover-container">
                <div className="inner cover" >
                    <div className="blink_logo"></div>
                    <h1 className="cover-heading">Blink for Web</h1>
                    {registerForm}
                    {guestForm}
                    <div className="checkbox">
                        <form className="form-guest-switcher">
                            <label className="react-toggle-label">
                                {buttonText}
                                <Toggle  defaultChecked={this.props.guestMode} onChange={this.handleGuestModeChange} />
                            </label>
                        </form>
                    </div>
                </div>
            </div>
        );
    }
});

module.exports = RegisterBox;
