'use strict';

const React          = require('react');
const ReactBootstrap = require('react-bootstrap');
const Modal          = ReactBootstrap.Modal;

const utils          = require('../utils');


class CallMeMaybeModal extends React.Component {
    constructor(props) {
        super(props);

        // ES6 classes no longer autobind
        this.handleClipboardButton = this.handleClipboardButton.bind(this);
    }

    handleClipboardButton(event) {
        const sipUri = this.props.callUrl.split('/').slice(-1)[0];    // hack!
        const message = 'You can call me using a Web browser at ${this.props.callUrl} or a SIP client at ${sipUri} ' +
                  'or by using the freely available Sylk WebRTC client app at http://sylkserver.com'

        utils.copyToClipboard(message);
        this.props.notificationCenter().postSystemNotification('Call me, maybe?', {body: 'URL copied to the clipboard'});
        this.props.close();
    }

    render() {
        return (
            <Modal show={this.props.show} onHide={this.props.close} aria-labelledby="cmodal-title-sm">
                <Modal.Header closeButton>
                    <Modal.Title id="cmodal-title-sm">Call me, maybe?</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <p>
                        Share <strong><a href={this.props.callUrl} target="_blank" rel="noopener noreferrer">this link</a></strong> with others so they can easily call you.
                    </p>
                    <div className="text-center">
                        <button className="btn btn-lg btn-primary" onClick={this.handleClipboardButton} >
                            <i className="fa fa-clipboard"></i>&nbsp; Copy to clipboard
                        </button>
                    </div>
                </Modal.Body>
            </Modal>
        );
    }
}

CallMeMaybeModal.propTypes = {
    show               : React.PropTypes.bool.isRequired,
    close              : React.PropTypes.func.isRequired,
    callUrl            : React.PropTypes.string.isRequired,
    notificationCenter : React.PropTypes.func.isRequired
};


module.exports = CallMeMaybeModal;
