'use strict';

const React             = require('react');
const PropTypes         = require('prop-types');
const { default: clsx } = require('clsx');
const TransitionGroup   = require('react-transition-group/TransitionGroup');
const CSSTransition     = require('react-transition-group/CSSTransition');
const { DateTime }      = require('luxon');

class CallOverlay extends React.Component {
    constructor(props) {
        super(props);

        this.duration = null;
        this.timer = null;
        this._isMounted = true;

        // ES6 classes no longer autobind
        this.callStateChanged = this.callStateChanged.bind(this);
    }

    componentDidMount() {
        if (this.props.call) {
            if (this.props.call.state === 'accepted' || this.props.forceTimerStart === true) {
                this.startTimer();
            } else if (this.props.call.state !== 'terminated') {
                this.props.call.on('stateChanged', this.callStateChanged);
            }
        }
    }

    componentDidUpdate(prevProps, prevState) {
        if (prevProps.call == null && this.props.call) {
            if (this.props.call.state === 'accepted') {
                this.startTimer();
            } else if (this.props.call.state !== 'terminated') {
                this.props.call.on('stateChanged', this.callStateChanged);
            }
        }
    }

    componentWillUnmount() {
        this._isMounted = false;
        clearTimeout(this.timer);
    }

    callStateChanged(oldState, newState, data) {
        // Prevent starting timer when we are unmounted
        if (newState === 'accepted' && this._isMounted) {
            this.startTimer();
            this.props.call.removeListener('stateChanged', this.callStateChanged);
        }
    }

    startTimer() {
        if (this.timer !== null) {
            // already armed
            return;
        }

        // TODO: consider using window.requestAnimationFrame
        const startTime = DateTime.local();
        this.timer = setInterval(() => {
            const now = DateTime.local();
            this.duration = now.diff(startTime, 'seconds').toFormat('hh:mm:ss')
            if (this.props.show) {
                this.forceUpdate();
            }
        }, 300);
    }

    render() {
        let header;

        if (this.props.show) {
            let callDetail;
            if (this.duration !== null) {
                callDetail = <span><i className="fa fa-clock-o"></i> {this.duration} {this.props.callQuality}</span>;
            } else {
                callDetail = 'Connecting...'
            }

            const headerClasses = clsx(
                'call-header',
                {
                    'solid-background': this.props.onTop
                }
            );

            header = (
                <CSSTransition
                    key="call-trans"
                    classNames="videoheader"
                    timeout={{ enter: 300, exit: 300}}
                >
                    <div key="header" className={headerClasses}>
                        {this.props.buttons && this.props.buttons.top && this.props.buttons.top.left &&
                            <div className="call-top-left-buttons">
                                {this.props.buttons.top.left}
                            </div>
                        }
                        <p className="lead"><strong>Call with</strong> {this.props.remoteIdentity}</p>
                        <p className="lead">{callDetail}</p>
                        {this.props.buttons && this.props.buttons.top && this.props.buttons.top.right &&
                            <div className="call-top-buttons">
                                {this.props.buttons.top.right}
                            </div>
                        }
                    </div>
                </CSSTransition>
            );
        }

        const overlayClasses = clsx(
            'top-overlay',
            {
                'on-top': this.props.onTop
            }
        );

        return (
            <div className={overlayClasses}>
                <TransitionGroup>
                    {header}
                </TransitionGroup>
            </div>
        );
    }
}

CallOverlay.propTypes = {
    show: PropTypes.bool.isRequired,
    remoteIdentity: PropTypes.string.isRequired,
    call: PropTypes.object,
    forceTimerStart: PropTypes.bool,
    callQuality: PropTypes.object,
    onTop: PropTypes.bool,
    buttons: PropTypes.object
};


module.exports = CallOverlay;
