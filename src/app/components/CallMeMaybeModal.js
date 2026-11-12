'use strict';

const React          = require('react');
const PropTypes      = require('prop-types');
const ReactBootstrap = require('react-bootstrap');
const Modal          = ReactBootstrap.Modal;

const utils          = require('../utils');


class CallMeMaybeModal extends React.Component {
    constructor(props) {
        super(props);

        // ES6 classes no longer autobind
        this.handleClipboardButton = this.handleClipboardButton.bind(this);
        this.handleEmailButton = this.handleEmailButton.bind(this);

        const sipUri = this.props.callUrl.split('/').slice(-1)[0];    // hack!
        const emailMessage = `You can reach me directly through your web browser at:\r\n${this.props.callUrl}\r\n\r\n` +
                `Alternatively, you can call me using any SIP client at:\r\n${sipUri}\r\n\r\n` +
                'You can also download a free standalone client from:\r\nhttps://ag-projects.com/endpoints/';
        const subject = 'Call me, maybe?';

        this.emailLink = `mailto:?subject=${encodeURI(subject)}&body=${encodeURI(emailMessage)}`;
    }

    handleClipboardButton(event) {
        utils.copyToClipboard(this.props.callUrl);
        this.props.notificationCenter().postSystemNotification('Call me, maybe?', {body: 'URL copied to the clipboard'});
        this.props.close();
    }

    handleEmailButton(event) {
        const isElectron = navigator.userAgent.includes('Electron');
        if (isElectron) {
            window.open(this.emailLink, '_blank');
        } else {
            window.open(this.emailLink, '_self');
        }
        this.props.close();
    }

    render() {

        return (
            <Modal enforceFocus={false} show={this.props.show} onHide={this.props.close} aria-labelledby="cmodal-title-sm">
                <Modal.Header closeButton>
                    <Modal.Title id="cmodal-title-sm">Call me, maybe?</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <p>
                        Share <strong><a href={this.props.callUrl} target="_blank" rel="noopener noreferrer">this link</a></strong> with others so they can easily call you.
                        <br />
                        You can copy it to the clipboard or send it via email.
                    </p>
                    <div className="text-center">
                        <div className="button-group-lg btn-group">
                            <button className="btn btn-lg btn-primary" onClick={this.handleClipboardButton} >
                                <i className="fa fa-clipboard"></i>
                            </button>
                            <button className="btn btn-lg btn-primary" onClick={this.handleEmailButton} >
                                <i className="fa fa-envelope-o"></i>
                            </button>
                        </div>
                    </div>
                </Modal.Body>
            </Modal>
        );
    }
}

CallMeMaybeModal.propTypes = {
    show               : PropTypes.bool.isRequired,
    close              : PropTypes.func.isRequired,
    callUrl            : PropTypes.string.isRequired,
    notificationCenter : PropTypes.func.isRequired
};


module.exports = CallMeMaybeModal;
