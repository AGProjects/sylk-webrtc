'use strict';

const React = require('react');
const PropTypes = require('prop-types');
const ReactBootstrap = require('react-bootstrap');
const Modal = ReactBootstrap.Modal;
const { default: clsx } = require('clsx');
const superagent = require('superagent');
const InputMask = require('react-input-mask');
const config = require('../config');

class EnrollmentModal extends React.Component {
    constructor(props) {
        super(props);
        // save the initial state so we can restore it later
        this.initialState = {
            yourName: '',
            username: '',
            password: '',
            password2: '',
            email: '',
            enrolling: false,
            error: ''
        };
        this.state = Object.assign({}, this.initialState);
        // ES6 classes no longer autobind
        this.onHide = this.onHide.bind(this);
        this.handleFormFieldChange = this.handleFormFieldChange.bind(this);
        this.enrollmentFormSubmitted = this.enrollmentFormSubmitted.bind(this);
    }

    handleFormFieldChange(event) {
        event.preventDefault();
        let state = {};
        state[event.target.id] = event.target.value;
        this.setState(state);
    }

    enrollmentFormSubmitted(event) {
        event.preventDefault();
        // validate the password fields
        if (this.state.password !== this.state.password2) {
            this.setState({ error: 'Password mismatch' });
            return;
        }
        this.setState({ enrolling: true, error: '' });
        superagent.post(config.enrollmentUrl)
            .send(superagent.serialize['application/x-www-form-urlencoded']({
                username: 'tangtalk-' + this.state.username,
                password: this.state.password,
                email: this.state.email,
                display_name: this.state.yourName //eslint-disable-line camelcase
            }))
            .end((error, res) => {
                this.setState({ enrolling: false });
                if (error) {
                    this.setState({ error: error.toString() });
                    return;
                }
                let data;
                try {
                    data = JSON.parse(res.text);
                } catch (e) {
                    this.setState({ error: 'Could not decode response data' });
                    return;
                }
                if (data.success) {
                    this.props.handleEnrollment({
                        accountId: data.sip_address,
                        password: this.state.password
                    });
                    this.setState(this.initialState);
                } else if (data.error === 'user_exists') {
                    this.setState({ error: 'User already exists' });
                } else {
                    this.setState({ error: data.error_message });
                }
            });
    }

    onHide() {
        this.props.handleEnrollment(null);
        this.setState(this.initialState);
    }

    render() {
        const passwordClasses = clsx({
            'form-group': true,
            'has-error': this.state.password !== this.state.password2
        });

        let buttonText = 'Create';
        if (this.state.enrolling) {
            buttonText = <i className="fa fa-spin fa-cog"></i>;
        }

        let errorBox;
        if (this.state.error) {
            errorBox = <p className="text-danger pull-left"><i className="fa fa-exclamation-triangle"></i> {this.state.error}</p>;
        }

        return (
            <Modal show={this.props.show} onHide={this.onHide} aria-labelledby="emodal-title-sm">
                <Modal.Header closeButton>
                    <Modal.Title id="emodal-title-sm">Create account</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <form id="enrollmentForm" onSubmit={this.enrollmentFormSubmitted} className="form-horizontal" role="form">
                        <div className="form-group">
                            <label htmlFor="yourName" className="control-label col-sm-3">Display name</label>
                            <div className="col-sm-9">
                                <input type="text" id="yourName" className="form-control" placeholder="Operator ####" onChange={this.handleFormFieldChange} autoFocus required value={this.state.yourName} disabled={this.state.enrolling} />
                            </div>
                        </div>
                        <div className="form-group">
                            <label htmlFor="username" className="control-label col-sm-3">Phone Number</label>
                            <div className="col-sm-9">
                                <InputMask
                                    mask="999-999-9999"
                                    value={this.state.username}
                                    onChange={this.handleFormFieldChange}
                                    className="form-control"
                                    placeholder="###-###-####"
                                    required
                                    disabled={this.state.enrolling}
                                    id="username"
                                />
                            </div>
                        </div>
                        <div className={passwordClasses}>
                            <label htmlFor="password" className="control-label col-sm-3">Password</label>
                            <div className="col-sm-9">
                                <input type="password" id="password" className="form-control" onChange={this.handleFormFieldChange} required value={this.state.password} disabled={this.state.enrolling} />
                            </div>
                        </div>
                        <div className={passwordClasses}>
                            <label htmlFor="password2" className="control-label col-sm-3">Verify password</label>
                            <div className="col-sm-9">
                                <input type="password" id="password2" className="form-control" onChange={this.handleFormFieldChange} required value={this.state.password2} disabled={this.state.enrolling} />
                            </div>
                        </div>
                        <div className="form-group">
                            <label htmlFor="email" className="control-label col-sm-3">E-Mail</label>
                            <div className="col-sm-9">
                                <input type="email" id="email" className="form-control" placeholder="operator@tangtalk.io" onChange={this.handleFormFieldChange} required value={this.state.email} disabled={this.state.enrolling} />
                            </div>
                        </div>
                        <br />
                        <div className="text-right">
                            {errorBox}
                            <button type="submit" className="btn btn-success" disabled={this.state.enrolling}>{buttonText}</button>
                        </div>
                    </form>
                </Modal.Body>
            </Modal>
        );
    }
}

EnrollmentModal.propTypes = {
    handleEnrollment: PropTypes.func.isRequired,
    show: PropTypes.bool.isRequired
};

module.exports = EnrollmentModal;
