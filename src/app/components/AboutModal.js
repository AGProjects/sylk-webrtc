'use strict';

const React          = require('react');
const PropTypes      = require('prop-types');
const ReactBootstrap = require('react-bootstrap');
const Modal          = ReactBootstrap.Modal;


const AboutModal = (props) => {
    return (
        <Modal show={props.show} onHide={props.close} aria-labelledby="cmodal-title-sm">
            <Modal.Header closeButton>
                {/* <Modal.Title id="cmodal-title-sm">About Sylk</Modal.Title> */}
            </Modal.Header>
            <Modal.Body>
                <p>
                Sylk client is part of <a href="http://sylkserver.com" target="_blank" rel="noopener noreferrer">Sylk Suite</a>, a set of
                applications for real-time communications using SIP and WebRTC specifications
                </p>
                <br />
                <p>Copyright &copy; <a href="http://ag-projects.com" target="_blank" rel="noopener noreferrer">AG Projects</a></p>
            </Modal.Body>
        </Modal>
    );
}

AboutModal.propTypes = {
    show: PropTypes.bool.isRequired,
    close: PropTypes.func.isRequired
};


module.exports = AboutModal;
