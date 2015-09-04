'use strict';

const React          = require('react');
const ReactBootstrap = require('react-bootstrap');
const Modal          = ReactBootstrap.Modal;


let ErrorPanel = React.createClass({
    render: function() {
        return (
            <Modal {...this.props} bsSize='medium' bsStyle='danger' aria-labelledby='modal-title-sm'>
                <Modal.Header>
                    <Modal.Title><i className='fa fa-warning'></i> Warning</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    {this.props.errorMsg}
                </Modal.Body>
            </Modal>
        );
    }
});

module.exports = ErrorPanel;
