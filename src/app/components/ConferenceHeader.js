'use strict';

const React             = require('react');
const useState          = React.useState;
const useEffect         = React.useEffect;
const useRef            = React.useRef;
const PropTypes         = require('prop-types');
const { default: clsx } = require('clsx');
const TransitionGroup   = require('react-transition-group/TransitionGroup');
const CSSTransition     = require('react-transition-group/CSSTransition');
const { Duration }      = require('luxon');

const useInterval = (callback, delay) => {
    const savedCallback = useRef();

    // Remember the latest callback.
    useEffect(() => {
        savedCallback.current = callback;
    }, [callback]);

    // Set up the interval.
    useEffect(() => {
        function tick() {
            savedCallback.current();
        }
        if (delay !== null) {
            let id = setInterval(tick, delay);
            return () => clearInterval(id);
        }
    }, [delay]);
}

const ConferenceHeader = (props) => {
    let [seconds, setSeconds] = useState(0);

    useInterval(() => {
        setSeconds(seconds + 1);
    }, 1000);

    const duration = Duration.fromObject({seconds: seconds}).toFormat('hh:mm:ss');

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
                <i className="fa fa-clock-o"></i> {duration}
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
    onTop: PropTypes.bool
};


module.exports = ConferenceHeader;
