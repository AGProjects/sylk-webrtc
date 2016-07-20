'use strict';

const React      = require('react');
const classNames = require('classnames');

const Logo       = require('./Logo');
const Call       = require('./Call');
const config     = require('../config');


class CallByUriBox extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            accountId: ''
        };
        // ES6 classes no longer autobind
        this.handleAccountIdChange = this.handleAccountIdChange.bind(this);
        this.handleSubmit = this.handleSubmit.bind(this);
    }

    handleAccountIdChange(event) {
        this.setState({accountId: event.target.value});
    }

    handleSubmit(event) {
        event.preventDefault();
        let accountId = this.state.accountId.replace(/ /g,'_');
        accountId = accountId + '@' + config.defaultGuestDomain;
        this.props.handleCallByUri(accountId, this.props.targetUri);
    }

    render() {
        let validInput = this.state.accountId !== '';
        let defaultContent;
        let thanksContent;
        let call;

        const classes = classNames({
            'capitalize' : true,
            'btn'        : true,
            'btn-lg'     : true,
            'btn-block'  : true,
            'btn-default': this.state.accountId == '',
            'btn-primary': this.state.accountId !== ''
        });

        if (this.props.localMedia !== null) {
            call = (
                <Call
                    localMedia = {this.props.localMedia}
                    account = {this.props.account}
                    currentCall = {this.props.currentCall}
                    targetUri = {this.props.targetUri}
                />
            );
        } else if (this.props.callByUriState !== 'finished') {
            defaultContent = (
                <div>
                    <h2>You've been invited to call<br/><strong>{this.props.targetUri}</strong></h2>
                    <form className="form-guest" onSubmit={this.handleSubmit}>
                        <label className="sr-only">Name</label>
                        <div className="input-group">
                            <span className="input-group-addon"><i className="fa fa-globe fa-fw"></i></span>
                            <input id="inputName"
                                className="form-control"
                                placeholder="Enter your name"
                                value={this.state.accountId}
                                onChange={this.handleAccountIdChange}
                                required
                                autoFocus
                            />
                        </div>
                        <button type="submit" className={classes} disabled={!validInput}><i className="fa fa-video-camera"></i> Call</button>
                    </form>
                </div>
            );
        } else {
            thanksContent = (
                <div>
                    <Logo />
                    <h2>Thanks for calling!</h2>
                </div>
            );
        }

        return (
            <div className="cover-container">
                <div className="inner cover" >
                    {call}
                    {defaultContent}
                    {thanksContent}
                </div>
            </div>
        );
    }
}

CallByUriBox.propTypes = {
    handleCallByUri : React.PropTypes.func.isRequired,
    targetUri       : React.PropTypes.string,
    callByUriState  : React.PropTypes.string,
    localMedia      : React.PropTypes.object,
    account         : React.PropTypes.object,
    currentCall     : React.PropTypes.object
};


module.exports = CallByUriBox;
