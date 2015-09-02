'use strict';

const React      = require('react');
const sylkrtc    = require('sylkrtc');
const classNames = require('classnames');

const defaultDomain = 'sip2sip.info';

let Register = React.createClass({
    getInitialState() {
        return {
            accountId: '',
            password: '',
            registrationState: null,
            registering: false,
            retry: false,
        };
    },
    componentWillReceiveProps(nextProps) {
        let registrationState = nextProps.registrationState;
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
        this.props.handleRegistration(this.state.accountId + '@' + defaultDomain, this.state.password);
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
        let classes = classNames({
            'capitalize' : true,
            'btn'        : true,
            'btn-lg'     : true,
            'btn-block'  : true,
            'btn-default': !(this.state.password !== '' && this.state.accountId !== ''),
            'btn-primary': this.state.password !== '' && this.state.accountId !== '' && !this.state.registering,
            'btn-info'   : this.state.registering,
            'btn-success': this.state.registrationState === 'registered',
        });

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
                            <div className="input-group-addon domain">&#64;{defaultDomain}</div>
                        </div>
                        <label htmlFor="inputPassword" className="sr-only">Password</label>
                        <input type="password" id="inputPassword" ref="pass" className="form-control" placeholder="Password"  value={this.state.password} onChange={this.handlePasswordChange} required />
                        <button type="submit" className={classes} disabled={this.state.registering}>Sign In</button>
                    </form>
                </div>
            </div>
        );
    }
});

module.exports = Register;
