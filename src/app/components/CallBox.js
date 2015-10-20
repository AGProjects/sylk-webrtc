'use strict';

const React          = require('react');
const classNames     = require('classnames');

const SettingsBox = require('./SettingsBox');
const Logo        = require('./Logo');
const ConferenceModal = require('./ConferenceModal')


let CallBox = React.createClass({
    getInitialState: function() {
        return {
            targetUri: this.props.targetUri,
            conferenceTargetUri: '',
            showConferenceModal: false
        };
    },

    componentWillReceiveProps: function(nextProps) {
        this.setState({
            targetUri: nextProps.targetUri
        });
    },

    getTargetUri: function() {
        let targetUri = this.state.targetUri.replace(/ /g,'_');
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

    handleConferenceTargetChange: function(event) {
        this.setState({conferenceTargetUri: event.target.value});
    },

    handleAudioCall: function(event) {
        event.preventDefault();
        this.props.startAudioCall(this.getTargetUri());
    },

    handleVideoCall: function(event) {
        event.preventDefault();
        this.props.startVideoCall(this.getTargetUri());
    },

    handleConferenceCall: function(event) {
        event.preventDefault();
        this.setState({showConferenceModal: false});
        let conferenceTargetUri = this.state.conferenceTargetUri.replace(/ /g,'_');
        this.props.startAudioCall(conferenceTargetUri + '@conference.sip2sip.info');
    },

    showConferenceModal: function(event) {
        event.preventDefault();
        this.setState({showConferenceModal: true});
    },

    hideConferenceModal: function(event) {
        this.setState({showConferenceModal: false, conferenceTargetUri: ''});
    },

    render: function() {
        let classes = classNames({
            'btn'         : true,
            'btn-lg'      : true,
            'btn-success' : this.state.targetUri.length !== 0,
            'btn-warning' : this.state.targetUri.length === 0
        });

        let conferenceModal;
        if (this.state.showConferenceModal) {
            conferenceModal = <ConferenceModal onHide={this.hideConferenceModal} onCall={this.handleConferenceCall} inputChanged={this.handleConferenceTargetChange}/>
        }

        return (
            <div>
                <div className="cover-container">
                    <div className="inner cover">
                        <Logo />
                        <form className="form-dial" name="DialForm">
                            <p className="lead">Enter the address you wish to call</p>
                            <div className="input-group input-group-lg">
                                <input type="text" id="inputDestination" className="form-control"
                                    onChange={this.handleTargetChange}
                                    value={this.state.targetUri}
                                    required autoFocus
                                />
                                <span className="input-group-btn">
                                    <button type="button" className={classes} disabled={this.state.targetUri.length === 0} onClick={this.handleAudioCall}><i className="fa fa-phone"></i></button>
                                    <button type="submit" className={classes} disabled={this.state.targetUri.length === 0} onClick={this.handleVideoCall}><i className="fa fa-video-camera"></i></button>
                                </span>
                            </div>
                            <br/>
                            {!this.props.guestMode && <p>You can receive calls at {this.props.account.id}</p>}
                        </form>
                        <p>or</p>
                        <p><button className="btn btn-primary" onClick={this.showConferenceModal}>Join conference ...</button></p>
                    </div>
                </div>
                {conferenceModal}
                <SettingsBox account={this.props.account} signOut={this.props.signOut} guestMode={this.props.guestMode}/>
            </div>
        );
    }
});

module.exports = CallBox;
