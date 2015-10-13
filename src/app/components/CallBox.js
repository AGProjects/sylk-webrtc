'use strict';

const React          = require('react');
const classNames     = require('classnames');

const SettingsBox = require('./SettingsBox');

let CallBox = React.createClass({
    getInitialState: function() {
        return {
            targetUri: this.props.targetUri,
            callState: null
        };
    },

    componentWillReceiveProps: function(nextProps) {
        this.setState({
            targetUri: nextProps.targetUri
        });
    },

    getTargetUri: function() {
        let targetUri = this.state.targetUri;
        if (targetUri.indexOf('@') === -1) {
            // take the domain part from the account
            const domain = this.props.account.id.substring(this.props.account.id.indexOf('@') + 1);
            targetUri += '@' + domain;
        }
        return targetUri;
    },

    handleTargetChange: function(event) {
        this.setState({targetUri: event.target.value});
    },

    handleAudioCall: function(event) {
        event.preventDefault();
        this.props.startAudioCall(this.getTargetUri());
    },

    handleVideoCall: function(event) {
        event.preventDefault();
        this.props.startVideoCall(this.getTargetUri());
    },

    render: function() {
        let classes = classNames({
            'btn'         : true,
            'btn-lg'      : true,
            'btn-success' : this.state.targetUri.length !== 0,
            'btn-warning' : this.state.targetUri.length === 0,
        });

        return (
            <div>
                <div className="cover-container">
                    <div className="inner cover">
                        <div className='blink_logo'></div><br/>
                        <form className="form-dial" name='DialForm'>
                            <p className='lead'>Enter the address you wish to call</p>
                            <div className="input-group input-group-lg">
                                <input type='text' id="inputDestination" className="form-control"
                                    onChange={this.handleTargetChange}
                                    value={this.state.targetUri}
                                    required autofocus />
                                <span className="input-group-btn">
                                    <button type="button" className={classes} disabled={this.state.targetUri.length === 0} onClick={this.handleAudioCall}><i className='fa fa-phone'></i></button>
                                    <button type="submit" className={classes} disabled={this.state.targetUri.length === 0} onClick={this.handleVideoCall}><i className='fa fa-video-camera'></i></button>
                                </span>
                            </div>
                            <br/>
                            <p>You can receive calls at {this.props.account.id}</p>
                        </form>
                    </div>
                </div>
                <SettingsBox account={this.props.account} signOut={this.props.signOut} />
            </div>
        );
    }
});

module.exports = CallBox;
