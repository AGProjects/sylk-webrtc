'use strict';

const React          = require('react');
const PropTypes      = require('prop-types');
const ReactBootstrap = require('react-bootstrap');
const Modal          = ReactBootstrap.Modal;

const config          = require('../config');


class InviteParticipantsModal extends React.Component {
    constructor(props) {
        super(props);
        this.invitees = React.createRef();

        this.invite = this.invite.bind(this);
    }

    invite(event) {
        event.preventDefault();
        const uris = [];
        this.invitees.current.value.split(',').forEach((item) => {
            item = item.trim();
            if (item.indexOf('@') === -1) {
                item = `${item}@${config.defaultDomain}`;
            }
            uris.push(item);
        });
        if (uris && this.props.call) {
            this.props.call.inviteParticipants(uris);
        }
        this.props.close();
    }

    render() {
        return (
            <Modal show={this.props.show} onHide={this.props.close}>
                <Modal.Header closeButton>
                    <Modal.Title id="cmodal-title-sm">Invite Online Users</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <p className="lead">Enter the users you wish to invite</p>
                    <form onSubmit={this.invite}>
                        <label htmlFor="inputTarget" className="sr-only">Users</label>
                        <div className="input-group">
                            <span className="input-group-addon"><i className="fa fa-user-plus fa-fw"></i></span>
                            <input id="inputTarget" ref={this.invitees} className="form-control" placeholder="alice@sip2sip.info,bob,carol" required autoFocus />
                        </div>
                        <br />
                        <div className="text-right">
                            <button type="submit" className="btn btn-success"><i className="fa fa-paper-plane-o"></i> Invite</button>
                        </div>
                    </form>
                </Modal.Body>
            </Modal>
        );
    }
}

InviteParticipantsModal.propTypes = {
    show: PropTypes.bool.isRequired,
    close: PropTypes.func.isRequired,
    call: PropTypes.object
};


module.exports = InviteParticipantsModal;
