'use strict';

const React          = require('react');
const useEffect      = React.useEffect;
const PropTypes      = require('prop-types');
const ReactBootstrap = require('react-bootstrap');
const Popover        = ReactBootstrap.Popover;
const OverlayTrigger = ReactBootstrap.OverlayTrigger;


const IncomingCallModal = (props) => {
    useEffect(() => {
        document.addEventListener('keyup', onKeyUp);
        return (() => {
            document.removeEventListener('keyup', onKeyUp);
        });
    });

    const onKeyUp = (event) => {
        switch (event.which) {
            case 27:
                // ESC
                props.onHangup()
                break;
            default:
                break;
        }
    };

    if (props.call == null) {
        return false;
    }

    let callType = 'audio';
    if (props.call.mediaTypes.video) {
        callType = 'video';
    }

    const remoteIdentityLine = props.call.remoteIdentity.displayName || props.call.remoteIdentity.uri;

    const tooltip = (
        <Popover id="popover-trigger-hover-focus">
            <strong>{props.call.remoteIdentity.uri}</strong>
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
                        <button className="btn btn-danger btn-round-xxl" onClick={props.onHangup}><i className="fa fa-phone rotate-135"></i></button>
                        &nbsp;&nbsp;&nbsp;
                        <button className="btn btn-success btn-round-xxl" onClick={props.onAnswer} autoFocus><i className="fa fa-phone"></i></button>
                    </div>
                </div>
            </div>
        </div>
    );
}

IncomingCallModal.propTypes = {
    call     : PropTypes.object,
    onAnswer : PropTypes.func.isRequired,
    onHangup : PropTypes.func.isRequired
};


module.exports = IncomingCallModal;
