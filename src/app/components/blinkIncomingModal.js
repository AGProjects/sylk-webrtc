'use strict';

import React from 'react';
import {Modal} from 'react-bootstrap';
import AudioPlayer from './blinkAudioPlayer.js';

let IncomingCallModal = React.createClass({
    render() {
        let direction, caller;
        if (this.props.call !== null) {
            direction = this.props.call.direction ;
            caller = this.props.call.remoteIdentity;
        }
        return (
            <Modal {...this.props} aria-labelledby='modal-title-sm'>
                <Modal.Header closeButton>
                    <Modal.Title id='modal-title-sm'>Incoming call</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <div className='row'>
                        <div className='col-md-3'>
                            <i className="fa-3x fa fa-bell faa-ring animated"></i>
                        </div>
                        <div className='col-md-9 text-left'>
                        <p className='lead'>From: {caller}</p>
                        </div>
                    </div>
                    <AudioPlayer direction={direction}/>
                </Modal.Body>
                <Modal.Footer>
                    <div className="btn-group btn-group-justified" role="group">
                        <div className="btn-group" role="group">
                            <button className='btn btn-danger' onClick={this.props.onHide}><i className='fa fa-phone rotate-135'></i></button>
                        </div>
                        <div className="btn-group" role="group">
                            <button className='btn btn-success' onClick={this.props.onAnswer}><i className='fa fa-phone'></i></button>
                        </div>
                    </div>
                </Modal.Footer>
            </Modal>
        );
    }
});

module.exports = IncomingCallModal;
