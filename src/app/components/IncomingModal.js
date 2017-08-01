'use strict';

const React          = require('react');
const PropTypes      = require('prop-types');
const ReactBootstrap = require('react-bootstrap');
const Popover        = ReactBootstrap.Popover;
const OverlayTrigger = ReactBootstrap.OverlayTrigger;

const classNames = require('classnames');


class IncomingCallModal extends React.Component {
    constructor(props) {
        super(props);

        // ES6 classes no longer autobind
        this.onKeyUp = this.onKeyUp.bind(this);
    }

    componentWillMount() {
        document.addEventListener('keyup', this.onKeyUp);
    }

    componentWillUnmount() {
        document.removeEventListener('keyup', this.onKeyUp);
    }

    onKeyUp(event) {
        switch (event.which) {
            case 27:
                // ESC
                this.props.onHangup()
                break;
            default:
                break;
        }
    }

    render() {
        if (this.props.call == null) {
            return false;
        }

        let callType = 'audio';
        if (this.props.call.mediaTypes.video) {
            callType = 'video';
        }

        const remoteIdentityLine = this.props.call.remoteIdentity.displayName || this.props.call.remoteIdentity.uri;

        const tooltip = (
            <Popover id="popover-trigger-hover-focus">
                <strong>{this.props.call.remoteIdentity.uri}</strong>
            </Popover>
        );

        return (
            <div>
                <div className="modal-backdrop"></div>
                <div className="modal" style={{display: 'block'}}>
                    <div className="loading">
                        <div className="loading-inner">
                            <OverlayTrigger placement="top" overlay={tooltip}>
                                <i className="fa fa-user fa-5 fa-fw incoming-user-icon"></i>
                            </OverlayTrigger>
                            <h1>{remoteIdentityLine}</h1>
                            <h4>is calling with {callType}</h4>
                            <br />
                            <br />
                            <br />
                            <button className="btn btn-danger btn-round-xxl" onClick={this.props.onHangup}><i className="fa fa-phone rotate-135"></i></button>
                            &nbsp;&nbsp;&nbsp;
                            <button className="btn btn-success btn-round-xxl" onClick={this.props.onAnswer}><i className="fa fa-phone"></i></button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }
}

IncomingCallModal.propTypes = {
    call     : PropTypes.object,
    onAnswer : PropTypes.func.isRequired,
    onHangup : PropTypes.func.isRequired
};


module.exports = IncomingCallModal;
