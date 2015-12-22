'use strict';

const React          = require('react');
const ReactBootstrap = require('react-bootstrap');
const Modal          = ReactBootstrap.Modal;


let IncomingCallModal = React.createClass({
    propTypes: {
        show     : React.PropTypes.bool.isRequired,
        call     : React.PropTypes.object,
        onAnswer : React.PropTypes.func.isRequired,
        onHide   : React.PropTypes.func.isRequired
    },

    render: function() {
        let callType = 'Audio';
        if (this.props.call !== null && this.props.call.mediaTypes.video) {
            callType = 'Video';
        }

        let remoteIdentity = '';
        if (this.props.call !== null) {
            remoteIdentity = this.props.call.remoteIdentity.toString();
        }

        return (
            <Modal show={this.props.show} onHide={this.props.onHide} aria-labelledby="modal-title-sm">
                <Modal.Header closeButton>
                    <Modal.Title id="modal-title-sm">Incoming {callType} call</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <div className="row">
                        <div className="col-md-3">
                            <i className="fa-3x fa fa-bell faa-ring animated"></i>
                        </div>
                        <div className="col-md-9 text-left">
                            <p className="lead">From: {remoteIdentity}</p>
                        </div>
                    </div>
                </Modal.Body>
                <Modal.Footer>
                    <div className="btn-group btn-group-justified" role="group">
                        <div className="btn-group" role="group">
                            <button className="btn btn-danger" onClick={this.props.onHide}><i className="fa fa-phone rotate-135"></i></button>
                        </div>
                        <div className="btn-group" role="group">
                            <button className="btn btn-success" onClick={this.props.onAnswer}><i className="fa fa-phone"></i></button>
                        </div>
                    </div>
                </Modal.Footer>
            </Modal>
        );
    }
});

module.exports = IncomingCallModal;
