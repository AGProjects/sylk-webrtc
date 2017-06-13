'use strict';

const debug          = require('debug');
const React          = require('react');
const PropTypes      = require('prop-types');
const ReactBootstrap = require('react-bootstrap');
const Modal          = ReactBootstrap.Modal;
const classNames     = require('classnames');

const AudioPlayer    = require('./AudioPlayer');

const DEBUG = debug('blinkrtc:DTMF');


class DTMFModal extends React.Component {
    sendDtmf(tone) {
        DEBUG('DTMF tone was sent: ' + tone);
        let player = null;
        switch (tone) {
            case '1':
                player = this.refs.audioPlayerDtmf1;
                break;
            case '2':
                player = this.refs.audioPlayerDtmf2;
                break;
            case '3':
                player = this.refs.audioPlayerDtmf3;
                break;
            case '4':
                player = this.refs.audioPlayerDtmf4;
                break;
            case '5':
                player = this.refs.audioPlayerDtmf5;
                break;
            case '6':
                player = this.refs.audioPlayerDtmf6;
                break;
            case '7':
                player = this.refs.audioPlayerDtmf7;
                break;
            case '8':
                player = this.refs.audioPlayerDtmf8;
                break;
            case '9':
                player = this.refs.audioPlayerDtmf9;
                break;
            case '0':
                player = this.refs.audioPlayerDtmf0;
                break;
            case '*':
                player = this.refs.audioPlayerDtmfStar;
                break;
            case '#':
                player = this.refs.audioPlayerDtmfHash;
                break;
            default:
                break;
        }
        if (player) {
            player.play();
        }

        if (this.props.call !== null) {
            this.props.call.sendDtmf(tone);
        }
    }

    render() {
        const buttonClasses = classNames({
            'btn'            : true,
            'btn-round-xxl'  : true,
            'btn-dtmf'       : true
        });

        return (
            <Modal show={this.props.show} onHide={this.props.hide} aria-labelledby="dmodal-title-sm">
                <Modal.Header closeButton>
                    <Modal.Title id="modal-title-sm">DTMF</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                        <button key="dtmfButton1" type="button" className={buttonClasses} onClick={this.sendDtmf.bind(this, '1')}>1</button>
                        <button key="dtmfButton2" type="button" className={buttonClasses} onClick={this.sendDtmf.bind(this, '2')}>2</button>
                        <button key="dtmfButton3" type="button" className={buttonClasses} onClick={this.sendDtmf.bind(this, '3')}>3</button>
                        <br />
                        <button key="dtmfButton4" type="button" className={buttonClasses} onClick={this.sendDtmf.bind(this, '4')}>4</button>
                        <button key="dtmfButton5" type="button" className={buttonClasses} onClick={this.sendDtmf.bind(this, '5')}>5</button>
                        <button key="dtmfButton6" type="button" className={buttonClasses} onClick={this.sendDtmf.bind(this, '6')}>6</button>
                        <br />
                        <button key="dtmfButton7" type="button" className={buttonClasses} onClick={this.sendDtmf.bind(this, '7')}>7</button>
                        <button key="dtmfButton8" type="button" className={buttonClasses} onClick={this.sendDtmf.bind(this, '8')}>8</button>
                        <button key="dtmfButton9" type="button" className={buttonClasses} onClick={this.sendDtmf.bind(this, '9')}>9</button>
                        <br />
                        <button key="dtmfButtonStar" type="button" className={buttonClasses} onClick={this.sendDtmf.bind(this, '*')}>*</button>
                        <button key="dtmfButton0"    type="button" className={buttonClasses} onClick={this.sendDtmf.bind(this, '0')}>0</button>
                        <button key="dtmfButtonHash" type="button" className={buttonClasses} onClick={this.sendDtmf.bind(this, '#')}>#</button>
                    <AudioPlayer ref="audioPlayerDtmf1" sourceFile="assets/sounds/dtmf/1.wav" />
                    <AudioPlayer ref="audioPlayerDtmf2" sourceFile="assets/sounds/dtmf/2.wav" />
                    <AudioPlayer ref="audioPlayerDtmf3" sourceFile="assets/sounds/dtmf/3.wav" />
                    <AudioPlayer ref="audioPlayerDtmf4" sourceFile="assets/sounds/dtmf/4.wav" />
                    <AudioPlayer ref="audioPlayerDtmf5" sourceFile="assets/sounds/dtmf/5.wav" />
                    <AudioPlayer ref="audioPlayerDtmf6" sourceFile="assets/sounds/dtmf/6.wav" />
                    <AudioPlayer ref="audioPlayerDtmf7" sourceFile="assets/sounds/dtmf/7.wav" />
                    <AudioPlayer ref="audioPlayerDtmf8" sourceFile="assets/sounds/dtmf/8.wav" />
                    <AudioPlayer ref="audioPlayerDtmf9" sourceFile="assets/sounds/dtmf/9.wav" />
                    <AudioPlayer ref="audioPlayerDtmf0" sourceFile="assets/sounds/dtmf/0.wav" />
                    <AudioPlayer ref="audioPlayerDtmfStar" sourceFile="assets/sounds/dtmf/star.wav" />
                    <AudioPlayer ref="audioPlayerDtmfHash" sourceFile="assets/sounds/dtmf/hash.wav" />
                </Modal.Body>
            </Modal>
        );
    }
}

DTMFModal.propTypes = {
    show: PropTypes.bool.isRequired,
    hide: PropTypes.func.isRequired,
    call: PropTypes.object
};


module.exports = DTMFModal;
