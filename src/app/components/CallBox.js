'use strict';

const React          = require('react');
const classNames     = require('classnames');

const ConferenceModal = require('./ConferenceModal')
const utils           = require('../utils');


class CallBox extends React.Component {
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
        this.handleDropdownChange = this.handleDropdownChange.bind(this);
    }

    componentWillReceiveProps(nextProps) {
        if (nextProps.callState !== 'init') {
            this.setState({
                targetUri: nextProps.targetUri
            });
        }
    }

    getTargetUri() {
        let domain = this.props.account.id.substring(this.props.account.id.indexOf('@') + 1);
        return utils.normalizeUri(this.state.targetUri, domain);
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

    handleDropdownChange(event) {
        let elem = document.getElementById('inputDestination');
        elem.focus();
        this.setState({targetUri: event.target.value});
    }

    render() {
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
                        <form className="form-dial" name="DialForm">
                            <p className="lead">Enter the address you wish to call</p>
                            <div className="form-group">
                                <input type="text" list="historyList" id="inputDestination" className="form-control input-lg"
                                    onChange={this.handleTargetChange}
                                    value={this.state.targetUri}
                                    disabled={this.props.callState === 'init'}
                                    autoCapitalize="off"
                                    autoCorrect="off"
                                    required
                                    autoFocus
                                />
                                <datalist id="historyList">
                                {
                                    this.props.history.map((item, idx) => {
                                        return <option key={idx} value={item}>{item}</option>;
                                    })
                                }
                                </datalist>
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
            </div>
        );
    }
}

CallBox.propTypes = {
    account        : React.PropTypes.object.isRequired,
    callState      : React.PropTypes.string,
    guestMode      : React.PropTypes.bool,
    startAudioCall : React.PropTypes.func.isRequired,
    startVideoCall : React.PropTypes.func.isRequired,
    targetUri      : React.PropTypes.string,
    history        : React.PropTypes.array
};


module.exports = CallBox;
