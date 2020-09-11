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
                <p className="lead">We hope this {props.wasCall === true ? 'call' : 'conference'} worked well for you.<br /> If you want to make use of the standalone application, you can download Sylk Client:</p>
                <a className="btn btn-primary btn-lg" href={config.downloadUrl} target="_blank" rel="noopener noreferrer">Download</a>
            </div>
        </div>
    );
};


CallCompleteBox.propTypes = {
    wasCall  : PropTypes.bool
};

module.exports = CallCompleteBox;
