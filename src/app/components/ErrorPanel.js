'use strict';

const React          = require('react');
const ReactBootstrap = require('react-bootstrap');
const Modal          = ReactBootstrap.Modal;


const ErrorPanel = (props) => {
    return (
        <Modal show={true} backdrop="static" bsStyle="danger" aria-labelledby="modal-title-sm">
            <Modal.Header>
                <Modal.Title><i className="fa fa-warning"></i> Warning</Modal.Title>
            </Modal.Header>
            <Modal.Body>
                {props.errorMsg}
            </Modal.Body>
        </Modal>
    );
}

ErrorPanel.propTypes = {
    errorMsg: React.PropTypes.string.isRequired
};


module.exports = ErrorPanel;
