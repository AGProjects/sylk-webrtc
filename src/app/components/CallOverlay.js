'use strict';

const React = require('react');
const PropTypes = require('prop-types');
const { default: clsx } = require('clsx');
const { DateTime }      = require('luxon');
const { default: TransitionGroup } = require('react-transition-group/TransitionGroup');
const { default: CSSTransition } = require('react-transition-group/CSSTransition');

const Timer = require('./Timer');

const stateMap = {
    ringing: 'Ringing...',
    connecting: 'Connecting...'
}

class CallOverlay extends React.Component {
    constructor(props) {
        super(props);

        this._electron = false;

        this.state = { callState: 'connecting' };

        // ES6 classes no longer autobind
        this.callStateChanged = this.callStateChanged.bind(this);
    }

    componentDidMount() {
        if (this.props.call) {
            if (this.props.call.state !== 'terminated') {
                this.props.call.on('stateChanged', this.callStateChanged);
            }
        }

        if (typeof window.process !== 'undefined') {
            if (window.process.versions.electron !== '' && window.process.platform === 'darwin') {
                this._electron = true;
            }
        }
    }

    componentDidUpdate(prevProps, prevState) {
        if (prevProps.call == null && this.props.call) {
            if (this.props.call.state !== 'terminated') {
                this.props.call.on('stateChanged', this.callStateChanged);
            }
        }
    }

    callStateChanged(oldState, newState, data) {
        switch (newState) {
            case 'ringing':
                if (this.state.callState !== 'ringing') {
                    this.setState({ callState: 'ringing' })
                }
                break;
            case 'proceeding':
                if (this.state.callState !== 'ringing' && data && (data.code === 110 || data.code === 180)) {
                    this.setState({ callState: 'ringing' })
                }
                break;
            case 'accepted':
                this.props.call.removeListener('stateChanged', this.callStateChanged);
                break;
            default:
                break;
        }
    }

    render() {
        let header;

        if (this.props.show) {
            let callDetail;

            if (this.props.call && (this.props.call.state === 'accepted' || this.props.call.state === 'established')) {
                if (!this.props.call._startTime) {
                    this.props.call._startTime = DateTime.local();
                }

                callDetail = (
                    <span>
                    <i className="fa fa-clock-o"></i>{" "}
                    <Timer startTime={this.props.call._startTime} />{" "}
                    {this.props.callQuality}
                    </span>
                );
            } else {
                callDetail = stateMap[this.state.callState] || '';
            }

            const headerClasses = clsx(
                'call-header',
                {
                    'solid-background': this.props.onTop
                }
            );

            const leftButtonClasses = clsx({
                'call-top-left-buttons': true,
                'electron-margin': this._electron
            });

            header = (
                <CSSTransition
                    key="call-trans"
                    classNames="videoheader"
                    timeout={{ enter: 300, exit: 300 }}
                >
                    <div key="header" className={headerClasses}>
                        <div className="container-fluid">
                            {this.props.buttons && this.props.buttons.top && this.props.buttons.top.left &&
                                <div className={leftButtonClasses}>
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
    callQuality: PropTypes.object,
    onTop: PropTypes.bool,
    buttons: PropTypes.object
};


module.exports = CallOverlay;
