'use strict';

const React                   = require('react');
const PropTypes               = require('prop-types');
const CSSTransitionGroup      = require('react-transition-group/CSSTransitionGroup');
const classNames              = require('classnames');
const moment                  = require('moment');
const momentFormat            = require('moment-duration-format');


class CallOverlay extends React.Component {
    constructor(props) {
        super(props);

        this.duration = null;
        this.timer = null;

        // ES6 classes no longer autobind
        this.callStateChanged = this.callStateChanged.bind(this);
    }

    componentDidMount() {
        if (this.props.call) {
            if (this.props.call.state === 'established') {
                this.startTimer();
            } else if (this.props.call.state !== 'terminated') {
                this.props.call.on('stateChanged', this.callStateChanged);
            }
        }
    }

    componentWillReceiveProps(nextProps) {
        if (this.props.call == null && nextProps.call) {
            if (nextProps.call.state === 'established') {
                this.startTimer();
            } else if (nextProps.call.state !== 'terminated') {
                nextProps.call.on('stateChanged', this.callStateChanged);
            }
        }
    }

    componentWillUnmount() {
        clearTimeout(this.timer);
    }

    callStateChanged(oldState, newState, data) {
        if (newState === 'established') {
            this.startTimer();
        }
    }

    startTimer() {
        if (this.timer !== null) {
            // already armed
            return;
        }

        // TODO: consider using window.requestAnimationFrame

        const startTime = new Date();
        this.timer = setInterval(() => {
            this.duration = moment.duration(new Date() - startTime).format('hh:mm:ss', {trim: false});
            if (this.props.show) {
                this.forceUpdate();
            }
        }, 300);
    }

    render() {
        let header;

        if (this.props.show) {
            const textClasses = classNames({
                'lead'          : true
            });

            let callDetail;
            if (this.duration !== null) {
                callDetail = <span><i className="fa fa-clock-o"></i> {this.duration}</span>;
            } else {
                callDetail = 'Connecting...'
            }

            header = (
                <div key="header" className="call-header">
                    <p className={textClasses}><strong>Call with</strong> {this.props.remoteIdentity}</p>
                    <p className={textClasses}>{callDetail}</p>
                </div>
            );
        }

        return (
            <div className="top-overlay">
                <CSSTransitionGroup transitionName="videoheader" transitionEnterTimeout={300} transitionLeaveTimeout={300}>
                    {header}
                </CSSTransitionGroup>
            </div>
        );
    }
}

CallOverlay.propTypes = {
    show: PropTypes.bool.isRequired,
    remoteIdentity: PropTypes.string.isRequired,
    call: PropTypes.object
};


module.exports = CallOverlay;
