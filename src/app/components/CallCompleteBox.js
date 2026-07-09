'use strict';

const React = require('react');
const PropTypes = require('prop-types');

const Logo = require('./Logo');
const config = require('../config');


const CallCompleteBox = (props) => {
    const isCall = props.wasCall;
    const callOrConference = isCall ? 'call' : 'conference';
    const callOrJoin = isCall ? 'Call' : 'Join';

    return (
        <div className="cover-container">
            <div className="inner cover" >
                <Logo />
                {props.failureReason === ''
                    ?
                    <div>
                        <p className="lead">The {props.wasCall === true ? 'call' : 'conference'} cannot be completed at this moment.<br /> The reason was: <tt>{props.failureReason}</tt></p>
                        <button className="btn btn-primary btn-lg" onClick={props.retryHandler}>Try again</button>
                    </div>
                    :
                    <div>
                        <p className="lead">Would you like to {callOrJoin.toLowerCase()} {isCall ? '' : 'the conference room '}
                            <strong>
                                {props.wasCall === true
                                    ? props.targetUri
                                    : props.targetUri?.replace(`@${config.defaultConferenceDomain}`, '') ?? props.targetUri}
                                </strong> again?</p>
                            <button className="btn btn-primary btn-lg"  style={{margin: '10px', marginBottom:'25px'}} onClick={props.retryHandler}>
                                <i className="fa fa-sign-in" />&nbsp;{props.wasCall ? 'Call' : 'Join'} again
                            </button>
                        <hr style={{ width: '45%', marginBottom: '6px' }} />
                            <p className="" style={{}}>
                               We recommend using
                            <a className="" href={config.downloadUrl} target="_blank" rel="noopener noreferrer"> the desktop or mobile app </a> for the most feature-rich experience.</p>
                    </div>
                }
            </div>
        </div>
    );
};


CallCompleteBox.propTypes = {
    wasCall: PropTypes.bool,
    targetUri: PropTypes.string,
    retryHandler: PropTypes.func,
    failureReason: PropTypes.string
};

module.exports = CallCompleteBox;
