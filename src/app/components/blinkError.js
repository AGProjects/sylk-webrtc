'use strict';

import React from 'react';
import {Modal} from 'react-bootstrap';

let ErrorPanel = React.createClass({
    render() {
        let smClose = e => this.setState({smShow: false});
        return (
            <Modal {...this.props} bsSize='medium' bsStyle='danger' aria-labelledby='modal-title-sm'>
                <Modal.Header>
                    <Modal.Title><i className='fa fa-warning'></i> Error</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    {this.props.errorMsg}
                </Modal.Body>
            </Modal>
        );
    }
});

module.exports = ErrorPanel;
