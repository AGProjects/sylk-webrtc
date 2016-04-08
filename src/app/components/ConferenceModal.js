'use strict';

const React          = require('react');
const ReactBootstrap = require('react-bootstrap');
const Modal          = ReactBootstrap.Modal;
const classNames     = require('classnames');

const config          = require('../config');


let ConferenceModal = React.createClass({
    propTypes: {
        targetUri: React.PropTypes.string,
        show: React.PropTypes.bool.isRequired,
        handleConferenceCall: React.PropTypes.func.isRequired
    },

    getInitialState: function() {
        return {
            conferenceTargetUri: ''
        };
    },

    componentWillMount: function() {
        let targetUri = this.props.targetUri || '';
        this.setState({conferenceTargetUri: targetUri});
    },

    componentWillReceiveProps: function(nextProps) {
        let targetUri = nextProps.targetUri || '';
        this.setState({conferenceTargetUri: targetUri});
    },

    handleConferenceTargetChange: function(event) {
        event.preventDefault();
        this.setState({conferenceTargetUri: event.target.value});
    },

    join: function(event) {
        event.preventDefault();
        let uri = `${this.state.conferenceTargetUri.replace(/[\s()-]/g, '')}@${config.defaultConferenceDomain}`;
        this.props.handleConferenceCall(uri);
    },

    hide: function() {
        this.props.handleConferenceCall(null);
    },

    render: function() {
        let validUri = this.state.conferenceTargetUri.length > 0 && this.state.conferenceTargetUri.indexOf('@') === -1;
        let classes = classNames({
            'btn'         : true,
            'btn-success' : validUri,
            'btn-warning' : !validUri
        });

        return (
            <Modal show={this.props.show} onHide={this.hide} aria-labelledby="cmodal-title-sm">
                <Modal.Header closeButton>
                    <Modal.Title id="cmodal-title-sm">Join Conference</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <p className="lead">Enter the conference room you wish to join</p>
                    <form onSubmit={this.join}>
                        <label htmlFor="inputTarget" className="sr-only">Conference Room</label>
                        <div className="input-group">
                            <span className="input-group-addon"><i className="fa fa-users fa-fw"></i></span>
                            <input id="inputTarget" className="form-control" placeholder="Conference Room" onChange={this.handleConferenceTargetChange} required autoFocus value={this.state.conferenceTargetUri} />
                        </div>
                    </form>
                </Modal.Body>
                <Modal.Footer>
                    <p className="pull-left">Supported media: audio</p>
                    <button className={classes} disabled={!validUri} onClick={this.join}><i className="fa fa-phone"></i> Join</button>
                </Modal.Footer>
            </Modal>
        );
    }
});

module.exports = ConferenceModal;
