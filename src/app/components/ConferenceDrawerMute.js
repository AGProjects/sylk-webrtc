'use strict';

const React         = require('react');
const PropTypes     = require('prop-types');


const ConferenceDrawerMute = (props) => {
    return (
        <div className="form-group">
            <button id="mute" title="Mute everyone" className="btn btn-default btn-block" onClick={props.muteEverybody}>
                <i className="fa fa-microphone-slash" aria-hidden="true"></i>&nbsp;
                Mute everyone
            </button>
        </div>
    );
};

ConferenceDrawerMute.propTypes = {
    muteEverybody: PropTypes.func.isRequired
};


module.exports = ConferenceDrawerMute;
