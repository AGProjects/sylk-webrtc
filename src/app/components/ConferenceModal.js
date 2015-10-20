'use strict';

const React          = require('react');
const ReactBootstrap = require('react-bootstrap');
const Modal          = ReactBootstrap.Modal;
const classNames     = require('classnames');

let ConferenceModal = React.createClass({
    getInitialState: function() {
        return {
            conferenceTargetUri: ''
        };
    },


    handleConferenceTargetChange: function(event) {
        this.setState({conferenceTargetUri: event.target.value});
        this.props.inputChanged(event);
    },

    render: function() {
        let classes = classNames({
            'btn'         : true,
            'btn-success' : this.state.conferenceTargetUri.length !== 0,
            'btn-warning' : this.state.conferenceTargetUri.length === 0
        });

        return (
            <Modal show={true} onHide={this.props.onHide} aria-labelledby="cmodal-title-sm">
                <Modal.Header closeButton>
                    <Modal.Title id="cmodal-title-sm">Join Conference</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <p className="lead">Enter the conference room you wish to join</p>
                    <form onSubmit={this.props.onCall}>
                        <label htmlFor="inputTarget" className="sr-only">Conference Room</label>
                        <div className="input-group">
                            <span className="input-group-addon"><i className="fa fa-users fa-fw"></i></span>
                            <input id="inputTarget" className="form-control" placeholder="Conference Room" onChange={this.handleConferenceTargetChange} required autoFocus/>
                        </div>
                    </form>
                </Modal.Body>
                <Modal.Footer>
                        <button className={classes} disabled={this.state.conferenceTargetUri.length === 0} onClick={this.props.onCall}><i className="fa fa-phone"></i> Join</button>
                </Modal.Footer>
            </Modal>
        );
    }
});

module.exports = ConferenceModal;
