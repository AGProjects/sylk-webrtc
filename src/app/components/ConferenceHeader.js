'use strict';

const React             = require('react');
const PropTypes         = require('prop-types');
const { default: clsx } = require('clsx');
const { default: TransitionGroup } = require('react-transition-group/TransitionGroup');
const { default: CSSTransition } = require('react-transition-group/CSSTransition');
const { DateTime }      = require("luxon");
const Timer = require("./Timer");


const ConferenceHeader = (props) => {
    if (!props.call._startTime) {
        props.call._startTime = DateTime.local();
    }

    let videoHeader;
    let callButtons;

    const mainClasses = clsx({
        'top-overlay': true,
        'on-top': props.onTop
    });
    if (props.show) {
        const participantCount = props.participants.length + 1;

        const callDetail = (
            <span>
                <i className="fa fa-clock-o"></i>{" "}
                <Timer startTime={props.call._startTime} />
                &nbsp;&mdash;&nbsp;
                <i className="fa fa-users"></i> {participantCount} participant{participantCount > 1 ? 's' : ''}
		&nbsp;{props.callQuality}
            </span>
        );

        let electron = false;
        if (typeof window.process !== 'undefined') {
            if (window.process.versions.electron !== '' && window.process.platform === 'darwin') {
                electron = true;
            }
        }

        const leftButtonClasses = clsx({
            'conference-top-left-buttons': true,
            'electron-margin': electron
        });

        const headerClasses = clsx({
            'call-header': true,
            'solid-background': props.transparent === false
        });

        videoHeader = (
            <CSSTransition
                key="header"
                classNames="videoheader"
                timeout={{ enter: 300, exit: 300}}
            >
                <div key="header" className={headerClasses}>
                    <div className="container-fluid">
                        <div className={leftButtonClasses}>
                            {props.buttons.top.left}
                        </div>
                        <p className="lead"><strong>Conference:</strong> {props.remoteIdentity}</p>
                        <p className="lead">{callDetail}</p>
                        <div className="conference-top-buttons">
                            {props.buttons.top.right}
                        </div>

                    </div>
                </div>
            </CSSTransition>
        );

        callButtons = (
            <CSSTransition
                key="header2"
                classNames="videoheader"
                timeout={{ enter: 300, exit: 300}}
            >
            <div className="conference-buttons">
                {props.buttons.bottom}
            </div>
            </CSSTransition>
        );
    }

    return (
        <div className={mainClasses}>
            <TransitionGroup>
                {videoHeader}
                {callButtons}
            </TransitionGroup>
        </div>
    );
}

ConferenceHeader.propTypes = {
    show: PropTypes.bool.isRequired,
    remoteIdentity: PropTypes.string.isRequired,
    participants: PropTypes.array.isRequired,
    buttons: PropTypes.object.isRequired,
    transparent: PropTypes.bool,
    callQuality: PropTypes.object,
    onTop: PropTypes.bool,
    call: PropTypes.object.isRequired
};


module.exports = ConferenceHeader;
