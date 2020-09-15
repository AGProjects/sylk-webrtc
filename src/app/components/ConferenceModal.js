'use strict';

const React          = require('react');
const useState       = React.useState;
const useEffect      = React.useEffect;
const PropTypes      = require('prop-types');
const ReactBootstrap = require('react-bootstrap');
const Modal          = ReactBootstrap.Modal;
const { default: clsx } = require('clsx');

const config          = require('../config');

const ConferenceModal = (props) => {
    const [conferenceTargetUri, setConferenceTargetUri] = useState('');

    useEffect(() => {
            setConferenceTargetUri(props.conference);
    }, [props.conference]);

    const join = (event) => {
        event.preventDefault();
        const uri = `${conferenceTargetUri.replace(/[\s()-]/g, '')}@${config.defaultConferenceDomain}`;
        props.handleConferenceCall(uri.toLowerCase());
    }

    const onHide = () => {
        props.handleConferenceCall(null);
    }

    const validUri = conferenceTargetUri.length > 0 && conferenceTargetUri.indexOf('@') === -1;

    const classes = clsx({
        'btn'         : true,
        'btn-success' : validUri,
        'btn-warning' : !validUri
    });

    return (
        <Modal show={props.show} onHide={onHide} aria-labelledby="cmodal-title-sm">
            <Modal.Header closeButton>
                <Modal.Title id="cmodal-title-sm">Join Video Conference</Modal.Title>
            </Modal.Header>
            <Modal.Body>
                <p className="lead">Enter the conference room you wish to join</p>
                <form onSubmit={join}>
                    <label htmlFor="inputTarget" className="sr-only">Conference Room</label>
                    <div className="input-group">
                        <span className="input-group-addon"><i className="fa fa-users fa-fw"></i></span>
                        <input
                            id="inputTarget"
                            className="form-control"
                            placeholder="Conference Room"
                            onChange={e => setConferenceTargetUri(e.target.value)}
                            value={conferenceTargetUri}
                            required
                            autoFocus
                        />
                    </div>
                    <br />
                    <div className="text-right">
                        <button type="submit" className={classes} disabled={!validUri}><i className="fa fa-video-camera"></i> Join</button>
                    </div>
                </form>
            </Modal.Body>
        </Modal>
    );
}

ConferenceModal.propTypes = {
    show: PropTypes.bool.isRequired,
    handleConferenceCall: PropTypes.func.isRequired,
    conference: PropTypes.string
};


module.exports = ConferenceModal;
