'use strict';

const React      = require('react');
const classNames = require('classnames');

const Logo       = require('./Logo');
const Conference = require('./Conference');
const utils      = require('../utils');


class ConferenceByUriBox extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            displayName: ''
        };
        // ES6 classes no longer autobind
        this.handleDisplayNameChange = this.handleDisplayNameChange.bind(this);
        this.handleSubmit = this.handleSubmit.bind(this);
        this.callStateChanged = this.callStateChanged.bind(this);
    }

    componentWillReceiveProps(nextProps) {
        if (!this.props.currentCall && nextProps.currentCall) {
            nextProps.currentCall.on('stateChanged', this.callStateChanged);
        }
    }

    callStateChanged(oldState, newState, data) {
        if (newState === 'terminated') {
            utils.postNotification('Thanks for calling with Blink!', {timeout: 10});
        }
    }

    handleDisplayNameChange(event) {
        this.setState({displayName: event.target.value});
    }

    handleSubmit(event) {
        event.preventDefault();
        this.props.handler(this.state.displayName, this.props.targetUri);
    }

    render() {
        const validInput = this.state.displayName !== '';
        let content;

        if (this.props.localMedia !== null) {
            content = (
                <Conference
                    localMedia = {this.props.localMedia}
                    account = {this.props.account}
                    currentCall = {this.props.currentCall}
                    targetUri = {this.props.targetUri}
                />
            );
        } else {
            const classes = classNames({
                'capitalize' : true,
                'btn'        : true,
                'btn-lg'     : true,
                'btn-block'  : true,
                'btn-default': !validInput,
                'btn-primary': validInput
            });

            content = (
                <div>
                    <h2>You've been invited to join a conference!<br/><strong>{this.props.targetUri}</strong></h2>
                    <form className="form-guest" onSubmit={this.handleSubmit}>
                        <label className="sr-only">Name</label>
                        <div className="input-group">
                            <span className="input-group-addon"><i className="fa fa-globe fa-fw"></i></span>
                            <input id="inputName"
                                className="form-control"
                                placeholder="Enter your name"
                                value={this.state.displayName}
                                onChange={this.handleDisplayNameChange}
                                required
                                autoFocus
                            />
                        </div>
                        <br />
                        <button type="submit" className={classes} disabled={!validInput}><i className="fa fa-sign-in"></i> Join</button>
                    </form>
                </div>
            );
        }

        return (
            <div className="cover-container">
                <div className="inner cover" >
                    {content}
                </div>
            </div>
        );
    }
}

ConferenceByUriBox.propTypes = {
    handler         : React.PropTypes.func.isRequired,
    targetUri       : React.PropTypes.string,
    localMedia      : React.PropTypes.object,
    account         : React.PropTypes.object,
    currentCall     : React.PropTypes.object
};


module.exports = ConferenceByUriBox;
