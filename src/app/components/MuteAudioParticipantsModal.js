'use strict';

const React          = require('react');
const PropTypes      = require('prop-types');
const ReactBootstrap = require('react-bootstrap');
const Modal          = ReactBootstrap.Modal;


const MuteAudioParticipantsModal = (props) => {
    const handleMute = () => {
        props.handleMute();
        props.close();
    }
    return (
        <Modal show={props.show} onHide={props.close}>
            <Modal.Header closeButton>
                <Modal.Title id="cmodal-title-sm">Mute audio from everybody except yourself?</Modal.Title>
            </Modal.Header>
            <Modal.Body>
                <p className="lead text-left">You can mute the audio from everybody, but you can't unmute them.
                They can unmute themselves at any time.</p>
                <div className="text-right">
                    <button className="btn btn-primary" onClick={handleMute}>Mute</button>
                    <button className="btn btn-default" onClick={props.close}>Cancel</button>
                </div>
            </Modal.Body>
        </Modal>
    );
}

MuteAudioParticipantsModal.propTypes = {
    show: PropTypes.bool.isRequired,
    close: PropTypes.func.isRequired,
    handleMute: PropTypes.func.isRequired
};


module.exports = MuteAudioParticipantsModal;
