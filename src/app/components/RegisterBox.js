'use strict';

const React  = require('react');

const RegisterForm      = require('./RegisterForm');
const Logo              = require('./Logo');


const RegisterBox = (props) => {
    return (
        <div className="cover-container">
            <div className="inner cover" >
                <Logo />
                <RegisterForm
                    registrationInProgress={props.registrationInProgress}
                    handleRegistration={props.handleRegistration}
                />
            </div>
        </div>
    );
};

RegisterBox.propTypes = {
    handleRegistration     : React.PropTypes.func.isRequired,
    registrationInProgress : React.PropTypes.bool
};


module.exports = RegisterBox;
