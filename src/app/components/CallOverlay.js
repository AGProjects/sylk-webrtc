'use strict';

const React = require('react');
const PropTypes = require('prop-types');
const { default: clsx } = require('clsx');
const { DateTime }      = require('luxon');
const { default: TransitionGroup } = require('react-transition-group/TransitionGroup');
const { default: CSSTransition } = require('react-transition-group/CSSTransition');

const ReactBootstrap = require('react-bootstrap');
const Navbar = ReactBootstrap.Navbar;
const ButtonToolbar = ReactBootstrap.ButtonToolbar;

const Timer = require('./Timer');
const UserIcon = require('./UserIcon');
const config = require('../config');

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
            let isConference = false;

            if (this.props.call && (this.props.call.state === 'accepted' || this.props.call.state === 'established')) {
                if (!this.props.call._startTime) {
                    this.props.call._startTime = DateTime.local();
                }

                callDetail = (
                    <span>
                    <i className="fa fa-clock-o"></i>{' '}
                    <Timer startTime={this.props.call._startTime} />{' '}
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

            const rightButtonClasses = clsx({
                'call-top-buttons': true
            });

            let remoteIdentity;
            let type = 'Call with';

            if (this.props.call !== null) {
                if (this.props.call.remoteIdentity.uri.endsWith(`@${config.defaultConferenceDomain}`)) {
                    type = 'Conference';
                    isConference = true;
                }
                remoteIdentity = this.props.call.remoteIdentity;
            } else {
                remoteIdentity = { uri: this.props.remoteIdentity };
            }

            if (this.props.alternativeLayout) {
                header = (
                    <CSSTransition
                        key="call-trans"
                        classNames="videoheader"
                        timeout={{ enter: 300, exit: 300 }}
                    >
                        <Navbar inverse={true} fixedTop={true} fluid={true} style={{borderBottom: '3px solid #4cae4c'}}>
                            <Navbar.Header>
                                <div style={{float: 'left', margin: '0 auto 0 15px'}}>
                                    <UserIcon identity={remoteIdentity} active={false} small={true} isConference={isConference}/>
                                </div>
                                <Navbar.Brand style={{color: '#f0f0f0', padding: '15px'}}>
                                    <strong>{type}:</strong> {this.props.remoteIdentity} - {callDetail}
                                </Navbar.Brand>
                            </Navbar.Header>
                            {this.props.buttons &&
                                <ButtonToolbar bsClass="btn-toolbar navbar-btn-toolbar pull-right">
                                    {this.props.buttons}
                                </ButtonToolbar>
                            }
                        </Navbar>
                    </CSSTransition>
                )
            } else {
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
                                    <div className={rightButtonClasses}>
                                        {this.props.buttons.top.right}
                                    </div>
                                }
                            </div>
                        </div>
                    </CSSTransition>
                );
            }
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
    buttons: PropTypes.oneOfType([PropTypes.object, PropTypes.array]),
    alternativeLayout: PropTypes.bool
};


module.exports = CallOverlay;
