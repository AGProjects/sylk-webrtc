'use strict';

const React         = require('react');
const PropTypes     = require('prop-types');
const classNames    = require('classnames');
const utils         = require('../utils');


const ConferenceDrawerLog = (props) => {
    const entries = props.log.map((elem, idx) => {
        const classes = classNames({
            'text-danger'   : elem.level === 'error',
            'text-warning'  : elem.level === 'warning',
            'log-entry'     : true
        });

        const originator = elem.originator.displayName || elem.originator.uri || elem.originator;

        const messages = elem.messages.map((message, index) => {
            return <span key={index}>{message}<br /></span>;
        });

        const color = utils.generateMaterialColor(elem.originator.uri || elem.originator)['300'];
        return (
            <div className={classes} key={idx}>
                <div className="idx">{props.log.length - idx}</div>
                <div>
                    <span className="label label-info" style={{backgroundColor: color}}>{originator}</span> <span>{elem.action}</span><br />{messages}
                </div>
            </div>
        )
    });

    return (
        <div className="drawer-log">
            <h4 className="header">Configuration Events</h4>
            <pre>
                {entries}
            </pre>
        </div>
    );
};

ConferenceDrawerLog.propTypes = {
    log: PropTypes.array.isRequired
};


module.exports = ConferenceDrawerLog;
