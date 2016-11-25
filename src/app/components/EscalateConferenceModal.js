'use strict';

const React          = require('react');
const ReactBootstrap = require('react-bootstrap');
const Modal          = ReactBootstrap.Modal;

const config          = require('../config');


class EscalateConferenceModal extends React.Component {
    constructor(props) {
        super(props);
        this.escalate = this.escalate.bind(this);
    }

    escalate(event) {
        event.preventDefault();
        const uris = [];
        for (let item of this.refs.invitees.value.split(',')) {
            item = item.trim();
            if (item.indexOf('@') === -1) {
                item = `${item}@${config.defaultDomain}`;
            }
            uris.push(item);
        };
        uris.push(this.props.call.remoteIdentity.uri);
        this.props.escalateToConference(uris);
    }

    render() {
        return (
            <Modal show={this.props.show} onHide={this.props.close}>
                <Modal.Header closeButton>
                    <Modal.Title id="cmodal-title-sm">Move to conference</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <p className="lead">Please enter the account(s) you wish to add to this call. After pressing Move, all parties will be invited to join a conference.</p>
                    <form onSubmit={this.escalate}>
                        <label htmlFor="inputTarget" className="sr-only">Users</label>
                        <div className="input-group">
                            <span className="input-group-addon"><i className="fa fa-user-plus fa-fw"></i></span>
                            <input id="inputTarget" ref="invitees" className="form-control" placeholder="alice@sip2sip.info,bob,carol" required autoFocus />
                        </div>
                        <br />
                        <div className="text-right">
                            <button type="submit" className="btn btn-success"><i className="fa fa-paper-plane-o"></i> Move</button>
                        </div>
                    </form>
                </Modal.Body>
            </Modal>
        );
    }
}

EscalateConferenceModal.propTypes = {
    show: React.PropTypes.bool.isRequired,
    close: React.PropTypes.func.isRequired,
    call: React.PropTypes.object,
    escalateToConference: React.PropTypes.func
};


module.exports = EscalateConferenceModal;
