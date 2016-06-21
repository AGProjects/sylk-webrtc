'use strict';

const React          = require('react');
const classNames     = require('classnames');

const ConferenceModal = require('./ConferenceModal');
const URIInput       = require('./URIInput');
const config          = require('../config');
const utils           = require('../utils');


class ReadyBox extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            targetUri: this.props.targetUri,
            showConferenceModal: false
        };
        // ES6 classes no longer autobind
        this.handleTargetChange = this.handleTargetChange.bind(this);
        this.handleAudioCall = this.handleAudioCall.bind(this);
        this.handleVideoCall = this.handleVideoCall.bind(this);
        this.showConferenceModal = this.showConferenceModal.bind(this);
        this.handleConferenceCall = this.handleConferenceCall.bind(this);
    }

    componentWillReceiveProps(nextProps) {
        this.setState({
            targetUri: nextProps.targetUri
        });
    }

    getTargetUri() {
        let defaultDomain;
        if (this.props.guestMode) {
            defaultDomain = config.defaultDomain;
        } else {
            defaultDomain = this.props.account.id.substring(this.props.account.id.indexOf('@') + 1);
        }
        return utils.normalizeUri(this.state.targetUri, defaultDomain);
    }

    handleTargetChange(event) {
        this.setState({targetUri: event.target.value});
    }

    handleAudioCall(event) {
        event.preventDefault();
        this.props.startAudioCall(this.getTargetUri());
    }

    handleVideoCall(event) {
        event.preventDefault();
        this.props.startVideoCall(this.getTargetUri());
    }

    showConferenceModal(event) {
        event.preventDefault();
        this.setState({showConferenceModal: true});
    }

    handleConferenceCall(targetUri) {
        this.setState({showConferenceModal: false, targetUri: targetUri || ''});
        if (targetUri) {
            this.props.startAudioCall(targetUri);
        }
    }

    render() {
        const classes = classNames({
            'btn'           : true,
            'btn-round-big' : true,
            'btn-success'   : this.state.targetUri.length !== 0,
            'btn-warning'   : this.state.targetUri.length === 0
        });

        return (
            <div>
                <div className="cover-container">
                    <div className="inner cover">
                        <form className="form-dial" name="DialForm">
                            <p className="lead">Enter the address you wish to call</p>
                            <URIInput
                                value={this.state.targetUri}
                                data={this.props.history}
                                onChange={this.handleTargetChange}
                                autoFocus={true}
                            />
                            <div className="form-group">
                                <button type="button" className={classes} disabled={this.state.targetUri.length === 0} onClick={this.handleAudioCall}><i className="fa fa-phone"></i></button>
                                <button type="submit" className={classes} disabled={this.state.targetUri.length === 0} onClick={this.handleVideoCall}><i className="fa fa-video-camera"></i></button>
                                <button type="button" className="btn btn-primary btn-round-big" onClick={this.showConferenceModal}><i className="fa fa-users"></i></button>
                            </div>
                        </form>
                    </div>
                </div>
                <ConferenceModal
                    show={this.state.showConferenceModal}
                    handleConferenceCall={this.handleConferenceCall}
                    targetUri={this.state.targetUri}
                />
            </div>
        );
    }
}

ReadyBox.propTypes = {
    account        : React.PropTypes.object.isRequired,
    guestMode      : React.PropTypes.bool,
    startAudioCall : React.PropTypes.func.isRequired,
    startVideoCall : React.PropTypes.func.isRequired,
    targetUri      : React.PropTypes.string,
    history        : React.PropTypes.array
};


module.exports = ReadyBox;
