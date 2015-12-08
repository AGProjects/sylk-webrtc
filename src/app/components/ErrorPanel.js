'use strict';

const React          = require('react');
const ReactBootstrap = require('react-bootstrap');
const Modal          = ReactBootstrap.Modal;


let ErrorPanel = React.createClass({
    propTypes: {
        errorMsg: React.PropTypes.string.isRequired
    },

    onHide: function() {
        // noop, we never get here
    },

    render: function() {
        return (
            <Modal onHide={this.onHide} show={true} backdrop="static" bsStyle="danger" aria-labelledby="modal-title-sm">
                <Modal.Header>
                    <Modal.Title><i className="fa fa-warning"></i> Warning</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    {this.props.errorMsg}
                </Modal.Body>
            </Modal>
        );
    }
});

module.exports = ErrorPanel;
