'use strict';

const React          = require('react');
const ReactBootstrap = require('react-bootstrap');
const Modal          = ReactBootstrap.Modal;
const classNames     = require('classnames');
const superagent     = require('superagent');

const config         = require('../config');


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
        this.enroll = this.enroll.bind(this);
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
            this.setState({error: 'Password missmatch'});
            return;
        }
        this.setState({enrolling: true, error:''});
        superagent.post(config.enrollmentUrl)
                  .send(superagent.serialize['application/x-www-form-urlencoded']({username: this.state.username,
                                                                                   password: this.state.password,
                                                                                   email: this.state.email,
                                                                                   display_name: this.state.yourName}))   //eslint-disable-line camelcase
                  .end((error, res) => {
                      this.setState({enrolling: false});
                      if (error) {
                          this.setState({error: error.toString()});
                          return;
                      }
                      let data;
                      try {
                          data = JSON.parse(res.text);
                      } catch (e) {
                          this.setState({error: 'Could not decode response data'});
                          return;
                      }
                      if (data.success) {
                          this.props.handleEnrollment({accountId: data.sip_address,
                                                       password: this.state.password});
                          this.setState(this.initialState);
                      } else if (data.error === 'user_exists') {
                          this.setState({error: 'User already exists'});
                      } else {
                          this.setState({error: data.error_message});
                      }
                  });
    }

    enroll(event) {
        event.preventDefault();
        // what a horrible hack, YOLO.
        // this will trigger the form submission, and enrollmentFormSubmitted will be called
        document.getElementById('enrollmentFormSubmit').click();
    }

    onHide() {
        this.props.handleEnrollment(null);
        this.setState(this.initialState);
    }

    render() {
        let passwordClasses = classNames({
            'form-group' : true,
            'has-error'  : this.state.password !== this.state.password2
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
                    <Modal.Title id="emodal-title-sm">Create SIP account</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <form id="enrollmentForm" onSubmit={this.enrollmentFormSubmitted} className="form-horizontal" role="form">
                        <div className="form-group">
                            <label htmlFor="yourName" className="control-label col-sm-3">Display name</label>
                            <div className="col-sm-9">
                                <input type="text" id="yourName" className="form-control" placeholder="Alice" onChange={this.handleFormFieldChange} autoFocus required value={this.state.yourName} disabled={this.state.enrolling} />
                            </div>
                        </div>
                        <div className="form-group">
                            <label htmlFor="username" className="control-label col-sm-3">Username</label>
                            <div className="col-sm-9 ">
                                <div className="input-group">
                                    <input type="text" id="username" className="form-control" placeholder="alice" onChange={this.handleFormFieldChange} required value={this.state.username} disabled={this.state.enrolling} />
                                    <span className="input-group-addon">@{config.enrollmentDomain}</span>
                                </div>
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
                                <input type="email" id="email" className="form-control" placeholder="alice@atlanta.example.com" onChange={this.handleFormFieldChange} required value={this.state.email} disabled={this.state.enrolling} />
                            </div>
                        </div>
                        <button type="submit" id="enrollmentFormSubmit" style={{display: 'none'}}></button>
                    </form>
                </Modal.Body>
                <Modal.Footer>
                    {errorBox}
                    <button className="btn btn-success" disabled={this.state.enrolling} onClick={this.enroll}>{buttonText}</button>
                </Modal.Footer>
            </Modal>
        );
    }
}

EnrollmentModal.propTypes = {
    handleEnrollment: React.PropTypes.func.isRequired,
    show: React.PropTypes.bool.isRequired
};


module.exports = EnrollmentModal;
