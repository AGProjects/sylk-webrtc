'use strict';

const React          = require('react');
const classNames     = require('classnames');

const SettingsBox     = require('./SettingsBox');
const Logo            = require('./Logo');
const ConferenceModal = require('./ConferenceModal')


let CallBox = React.createClass({
    propTypes: {
        account        : React.PropTypes.object.isRequired,
        callState      : React.PropTypes.string,
        guestMode      : React.PropTypes.bool,
        startAudioCall : React.PropTypes.func.isRequired,
        startVideoCall : React.PropTypes.func.isRequired,
        targetUri      : React.PropTypes.string,
        history        : React.PropTypes.array
    },

    getInitialState: function() {
        return {
            targetUri: this.props.targetUri,
            showConferenceModal: false
        };
    },

    componentWillReceiveProps: function(nextProps) {
        if (nextProps.callState !== 'init') {
            this.setState({
                targetUri: nextProps.targetUri
            });
        }
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

    handleAudioCall: function(event) {
        event.preventDefault();
        this.props.startAudioCall(this.getTargetUri());
    },

    handleVideoCall: function(event) {
        event.preventDefault();
        this.props.startVideoCall(this.getTargetUri());
    },

    showConferenceModal: function(event) {
        event.preventDefault();
        this.setState({showConferenceModal: true});
    },

    handleConferenceCall: function(targetUri) {
        this.setState({showConferenceModal: false, targetUri: targetUri || ''});
        if (targetUri) {
            this.props.startAudioCall(targetUri);
        }
    },

    handleDropdownChange: function(event) {
        let elem = document.getElementById('inputDestination');
        elem.focus();
        this.setState({targetUri: event.target.value});
    },

    loadDestinations: function() {
        let options = [];
        options.push(<option></option>);
        for (let s of this.props.history) {
            options.push(<option>{s}</option>);
        }
        return options;
    },

    render: function() {
        let classes = classNames({
            'btn'           : true,
            'btn-round-big' : true,
            'btn-success'   : this.state.targetUri.length !== 0,
            'btn-warning'   : this.state.targetUri.length === 0
        });

        return (
            <div>
                <div className="cover-container">
                    <div className="inner cover">
                        <Logo />
                        <form className="form-dial" name="DialForm">
                            <p className="lead">Enter the address you wish to call</p>
                            <div className="form-group">
                                <div id="callDropdown">
                                    <input type="text" id="inputDestination" className="form-control input-lg"
                                        onChange={this.handleTargetChange}
                                        value={this.state.targetUri}
                                        disabled={this.props.callState === 'init'}
                                        required autoFocus
                                    />
                                    <select className="form-control input-lg" onChange={this.handleDropdownChange}>
                                        {this.loadDestinations()}
                                    </select>
                                </div>
                            </div>
                            <div className="form-group">
                                <button type="button" className={classes} disabled={this.state.targetUri.length === 0 || this.props.callState === 'init'} onClick={this.handleAudioCall}><i className="fa fa-phone"></i></button>
                                <button type="submit" className={classes} disabled={this.state.targetUri.length === 0 || this.props.callState === 'init'} onClick={this.handleVideoCall}><i className="fa fa-video-camera"></i></button>
                                <button type="button" className="btn btn-primary btn-round-big" disabled={this.props.callState === 'init'} onClick={this.showConferenceModal}><i className="fa fa-users"></i></button>
                            </div>
                        </form>
                    </div>
                </div>
                <ConferenceModal
                    show={this.state.showConferenceModal}
                    handleConferenceCall={this.handleConferenceCall}
                    targetUri={this.state.targetUri}
                />
                <SettingsBox
                    account={this.props.account}
                    guestMode={this.props.guestMode}
                />
            </div>
        );
    }
});

module.exports = CallBox;
