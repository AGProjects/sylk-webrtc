'use strict';

const React      = require('react');
const sylkrtc    = require('sylkrtc');
const classNames = require('classnames');

const EnrollmentModal = require('./EnrollmentModal');
const storage         = require('../storage');


class RegisterForm extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            accountId: '',
            password: '',
            registering: false,
            showEnrollmentModal: false
        };

        // ES6 classes no longer autobind
        [
            'handleAccountIdChange',
            'handlePasswordChange',
            'handleSubmit',
            'handleEnrollment',
            'createAccount'
        ].forEach((name) => {
            this[name] = this[name].bind(this);
        });
    }

    componentWillMount() {
        storage.get('account').then((account) => {
            if (account) {
                this.setState(account);
            }
        });
    }

    handleAccountIdChange(event) {
        this.setState({accountId: event.target.value});
    }

    handlePasswordChange(event) {
        this.setState({password: event.target.value});
    }

    handleSubmit(event) {
        event.preventDefault();
        this.props.handleRegistration(this.state.accountId, this.state.password);
    }

    handleEnrollment(account) {
        this.setState({showEnrollmentModal: false});
        if (account !== null) {
            this.setState({accountId: account.accountId, password: account.password, registering: true});
            this.props.handleRegistration(account.accountId, account.password);
        }
    }

    createAccount(event) {
        event.preventDefault();
        this.setState({showEnrollmentModal: true});
    }

    render() {
        const validInput = this.state.accountId.indexOf('@') !== -1 && this.state.password !== 0;
        const classes = classNames({
            'btn'        : true,
            'btn-lg'     : true,
            'btn-block'  : true,
            'btn-default': !validInput,
            'btn-primary': validInput && !this.state.registering,
            'btn-info'   : this.state.registering
        });

        return (
            <div>
                <p className="lead">Sign in to continue</p>
                <form className="form-signin" onSubmit={this.handleSubmit}>
                    <label htmlFor="inputEmail" className="sr-only">Sip Account</label>
                    <div className="input-group">
                        <span className="input-group-addon first"><i className="fa fa-globe fa-fw"></i></span>
                        <input type="email" id="inputUser" className="form-control" placeholder="Enter your account" value={this.state.accountId} onChange={this.handleAccountIdChange} required autoFocus/>
                    </div>
                    <label htmlFor="inputPassword" className="sr-only">Password</label>
                    <div className="input-group">
                        <span className="input-group-addon second"><i className="fa fa-lock fa-fw"></i></span>
                        <input type="password" id="inputPassword" ref="pass" className="form-control" placeholder="Password" value={this.state.password} onChange={this.handlePasswordChange} required />
                    </div>

                    <div className="btn-group btn-group-justified">
                        <div className="btn-group">
                            <button type="submit" className={classes} disabled={this.props.registrationInProgress || !validInput}>
                                <i className="fa fa-sign-in"></i>&nbsp;Sign In
                            </button>
                        </div>
                        <div className="btn-group">
                            <button className="btn btn-lg btn-primary" onClick={this.createAccount} disabled={this.props.registrationInProgress}>
                                <i className="fa fa-plus"></i>&nbsp;Sign Up
                            </button>
                        </div>
                    </div>
                </form>
                <EnrollmentModal show={this.state.showEnrollmentModal} handleEnrollment={this.handleEnrollment} />
            </div>
        );
    }
}

RegisterForm.propTypes = {
    handleRegistration     : React.PropTypes.func.isRequired,
    registrationInProgress : React.PropTypes.bool.isRequired
};


module.exports = RegisterForm;
