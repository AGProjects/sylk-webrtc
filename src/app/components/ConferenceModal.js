'use strict';

const React          = require('react');
const PropTypes      = require('prop-types');
const ReactBootstrap = require('react-bootstrap');
const Modal          = ReactBootstrap.Modal;
const classNames     = require('classnames');

const config          = require('../config');


class ConferenceModal extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            conferenceTargetUri: props.targetUri.split('@')[0],
            managed: false
        };
        this.handleConferenceTargetChange = this.handleConferenceTargetChange.bind(this);
        this.onHide = this.onHide.bind(this);
        this.join = this.join.bind(this);
    }

    componentWillReceiveProps(nextProps) {
        this.setState({conferenceTargetUri: nextProps.targetUri.split('@')[0]});
    }

    handleConferenceTargetChange(event) {
        event.preventDefault();
        this.setState({conferenceTargetUri: event.target.value});
    }

    join(event) {
        event.preventDefault();
        const uri = `${this.state.conferenceTargetUri.replace(/[\s()-]/g, '')}@${config.defaultConferenceDomain}`;
        this.props.handleConferenceCall(uri.toLowerCase(), this.state.managed);
    }

    onHide() {
        this.props.handleConferenceCall(null);
    }

    render() {
        const validUri = this.state.conferenceTargetUri.length > 0 && this.state.conferenceTargetUri.indexOf('@') === -1;
        const classes = classNames({
            'btn'         : true,
            'btn-success' : validUri,
            'btn-warning' : !validUri
        });

        return (
            <Modal show={this.props.show} onHide={this.onHide} aria-labelledby="cmodal-title-sm">
                <Modal.Header closeButton>
                    <Modal.Title id="cmodal-title-sm">Join Video Conference</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <p className="lead">Enter the conference room you wish to join</p>
                    <form onSubmit={this.join}>
                        <label htmlFor="inputTarget" className="sr-only">Conference Room</label>
                        <div className="input-group">
                            <span className="input-group-addon"><i className="fa fa-users fa-fw"></i></span>
                            <input id="inputTarget" className="form-control" placeholder="Conference Room" onChange={this.handleConferenceTargetChange} required autoFocus value={this.state.conferenceTargetUri} />
                        </div>
                        <br />
                        <div className="text-right">
                            <button type="submit" className={classes} disabled={!validUri}><i className="fa fa-video-camera"></i> Join</button>
                        </div>
                    </form>
                </Modal.Body>
            </Modal>
        );
    }
}

ConferenceModal.propTypes = {
    show: PropTypes.bool.isRequired,
    handleConferenceCall: PropTypes.func.isRequired,
    targetUri: PropTypes.string.isRequired
};


module.exports = ConferenceModal;
