'use strict';

const React      = require('react');
const PropTypes  = require('prop-types');
const { default: clsx } = require('clsx');
const ipaddr     = require('ipaddr.js');

const { withStyles }                    = require('@material-ui/core/styles');
const { FormGroup, FormControlLabel }   = require('@material-ui/core');
const { Checkbox }                      = require('@material-ui/core');

const EnrollmentModal = require('./EnrollmentModal');
const storage         = require('../storage');


const styles = {
    root: {
        color: '#ffffff',
        height: 48,
        width: 48,
        '&$checked': {
            color: '#ffffff'
        },
        '& .MuiSvgIcon-root': {
            fontSize: 24
        }
    },
    checked: {},
    font: {
        fontSize: '14px !important',
        color: '#ffffff'
    },
    center: {
        justifyContent: 'center'
    }
};

class RegisterForm extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            accountId: '',
            password: '',
            registering: false,
            remember: false,
            showEnrollmentModal: false
        };

        // ES6 classes no longer autobind
        [
            'handleAccountIdChange',
            'handlePasswordChange',
            'handleRememberChange',
            'handleSubmit',
            'handleEnrollment',
            'createAccount'
        ].forEach((name) => {
            this[name] = this[name].bind(this);
        });
    }

    componentDidMount() {
        storage.get('account').then((account) => {
            if (account) {
                this.setState(Object.assign({}, account, {remember: true}));
                if (this.props.autoLogin && this.state.password !== '') {
                    this.props.handleRegistration(this.state.accountId, this.state.password);
                }
            }
        });
    }

    handleAccountIdChange(event) {
        this.setState({accountId: event.target.value});
    }

    handlePasswordChange(event) {
        this.setState({password: event.target.value});
    }

    handleRememberChange(event) {
        this.setState({remember: event.target.checked});
    }

    handleSubmit(event) {
        event.preventDefault();
        this.props.handleRegistration(this.state.accountId, this.state.password, this.state.remember);
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
        const domain = this.state.accountId.substring(this.state.accountId.indexOf('@') + 1);
        const validDomain = !ipaddr.IPv4.isValidFourPartDecimal(domain) && !ipaddr.IPv6.isValid(domain);
        const validInput =  validDomain && this.state.accountId.indexOf('@') !== -1 && this.state.password !== 0;
        const classes = clsx({
            'btn'        : true,
            'btn-lg'     : true,
            'btn-block'  : true,
            'btn-default': !validInput,
            'btn-primary': validInput && !this.state.registering,
            'btn-info'   : this.state.registering
        });

        const formClasses = clsx({
            'form-signin'          : true,
            'form-signin-electron' : this.props.autoLogin
        });

        let rememberBox;
        if (!this.props.autoLogin) {
            rememberBox = (
                <FormGroup
                    row
                    classes={{
                        root: this.props.classes.center
                    }}
                >
                    <FormControlLabel
                        classes={{
                            label: this.props.classes.font
                        }}
                        control={
                            <Checkbox
                                checked={this.state.remember}
                                onChange={this.handleRememberChange}
                                classes={{
                                    root: this.props.classes.root,
                                    checked: this.props.classes.checked
                                }}
                            />
                        }
                        label="Remember me"
                    />
                </FormGroup>
            );
        }

        return (
            <div>
                <p className="lead">Sign in to continue</p>
                <form className={formClasses} onSubmit={this.handleSubmit}>
                    <label htmlFor="inputUser" className="sr-only">Sip Account</label>
                    <div className="input-group">
                        <span className="input-group-addon first"><i className="fa fa-globe fa-fw"></i></span>
                        <input type="email" id="inputUser" className="form-control" placeholder="Enter your account" value={this.state.accountId} onChange={this.handleAccountIdChange} required autoFocus/>
                    </div>
                    <label htmlFor="inputPassword" className="sr-only">Password</label>
                    <div className="input-group">
                        <span className="input-group-addon second"><i className="fa fa-lock fa-fw"></i></span>
                        <input type="password" id="inputPassword" className="form-control" placeholder="Password" value={this.state.password} onChange={this.handlePasswordChange} required />
                    </div>

                    {rememberBox}

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
    classes                : PropTypes.object.isRequired,
    handleRegistration     : PropTypes.func.isRequired,
    registrationInProgress : PropTypes.bool.isRequired,
    autoLogin              : PropTypes.bool
};


module.exports = withStyles(styles)(RegisterForm);
