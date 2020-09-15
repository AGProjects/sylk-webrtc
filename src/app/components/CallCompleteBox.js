'use strict';

const React         = require('react');
const PropTypes     = require('prop-types');

const Logo          = require('./Logo');
const config        = require('../config');


const CallCompleteBox = (props) => {
    return (
        <div className="cover-container">
            <div className="inner cover" >
                <Logo />
                { props.targetUri === ''
                    ? <div>
                        <p className="lead">We hope you enjoyed this {props.wasCall === true ? 'call' : 'conference'}.<br />If you did, you can try using Sylk Client appliction:</p>
                        <a className="btn btn-primary btn-lg" href={config.downloadUrl} target="_blank" rel="noopener noreferrer">Download</a>
                    </div>
                    : <div>
                        <p className="lead">The {props.wasCall === true ? 'call' : 'conference'} cannot be completed at this moment.<br /> The reason was: <tt>{props.failureReason}</tt></p>
                        <button className="btn btn-primary btn-lg" onClick={props.retryHandler}>Try again</button>
                    </div>
                }
            </div>
        </div>
    );
};


CallCompleteBox.propTypes = {
    wasCall  : PropTypes.bool,
    targetUri : PropTypes.string,
    retryHandler: PropTypes.func,
    failureReason: PropTypes.string
};

module.exports = CallCompleteBox;
