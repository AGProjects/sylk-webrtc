'use strict';

const React          = require('react');
const useEffect      = React.useEffect;
const PropTypes      = require('prop-types');
const ReactBootstrap = require('react-bootstrap');
const Popover        = ReactBootstrap.Popover;
const OverlayTrigger = ReactBootstrap.OverlayTrigger;

const UserIcon       = require('./UserIcon');


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

    const answerAudioOnly = () => {
        props.onAnswer({audio: true, video: false});
    }

    const answer = () => {
        props.onAnswer({audio: true, video: true});
    };

    if (props.call == null) {
        return false;
    }

    const buttonText = ['Decline', 'Accept', 'Audio'];

    let answerButtons = [
        <li key="hangupButton">
            <button id="decline" className="btn btn-danger btn-round-xxl" onClick={props.onHangup}><i className="fa fa-phone rotate-135"></i></button>
            <br />
            {buttonText.shift()}
        </li>
    ];

    let callType = 'audio';
    if (props.call.mediaTypes.video) {
        callType = 'video';
        answerButtons.push(<li key="videoAnswerButton">
            <button id="accept" className="btn btn-success btn-round-xxl" onClick={answer} autoFocus={props.autoFocus}><i className="fa fa-video-camera"></i></button>
            <br />
            {buttonText.shift()}
        </li>);
    }

    answerButtons.push(<li key="audioAnwerButton">
        <button id="audio" className="btn btn-success btn-round-xxl" onClick={answerAudioOnly} autoFocus={!props.call.mediaTypes.video && props.autoFocus}><i className="fa fa-phone"></i></button>
        <br />
        {buttonText.shift()}
    </li>);

    const remoteIdentityLine = props.call.remoteIdentity.displayName || props.call.remoteIdentity.uri;

    const tooltip = (
        <Popover id="popover-trigger-hover-focus">
            <strong>{props.call.remoteIdentity.uri}</strong>
        </Popover>
    );

    const spacers = [
        <br key="s1" />,
        <br key="s2" />
    ];
    return (
        <div>
            <div className="modal-backdrop"></div>
            <div className="modal" style={{display: 'block'}}>
                <div className="loading">
                    <div className="loading-inner">
                        <OverlayTrigger placement="top" overlay={tooltip}>
                            <UserIcon identity={props.call.remoteIdentity} large={true} />
                        </OverlayTrigger>
                        <h1>{remoteIdentityLine}</h1>
                        <h4>is calling with {callType}</h4>
                        <br />
                        {props.compact ? '' : spacers}
                        <ul className="list-inline">{answerButtons}</ul>
                    </div>
                </div>
            </div>
        </div>
    );
}

IncomingCallModal.propTypes = {
    call     : PropTypes.object,
    onAnswer : PropTypes.func.isRequired,
    onHangup : PropTypes.func.isRequired,
    autoFocus: PropTypes.bool.isRequired,
    compact  : PropTypes.bool
};


module.exports = IncomingCallModal;
