'use strict';

const React  = require('react');
const Toggle = require('react-toggle');

const RegisterForm      = require('./RegisterForm.js');

let RegisterBox = React.createClass({

    render: function() {

        let registerForm;
        registerForm = <RegisterForm {...this.props}/>;

        return (
            <div className="cover-container">
                <div className="inner cover" >
                    <div className='blink_logo'></div>
                    <h1 className="cover-heading">Blink for Web</h1>
                    {registerForm}
                </div>
            </div>
        );
    }
});

module.exports = RegisterBox;
