'use strict';

const React          = require('react');
const PropTypes      = require('prop-types');
const classNames            = require('classnames');
const ReactBootstrap = require('react-bootstrap');
const Navbar         = ReactBootstrap.Navbar;
const DropdownButton = ReactBootstrap.DropdownButton;
const MenuItem       = ReactBootstrap.MenuItem;
const ButtonToolbar  = ReactBootstrap.ButtonToolbar;

const config = require('../config');

const AboutModal       = require('./AboutModal');
const CallMeMaybeModal = require('./CallMeMaybeModal');


class NavigationBar extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            showAboutModal: false,
            showCallMeMaybeModal: false,
            mute: false
        }

        if (window.location.origin.startsWith('file://')) {
            this.callUrl = `${config.publicUrl}/call/${props.account.id}`;
        } else {
            this.callUrl = `${window.location.origin}/call/${props.account.id}`;
        }

        // ES6 classes no longer autobind
        [
            'handleMenu',
            'toggleAboutModal',
            'toggleCallMeMaybeModal',
            'toggleMute'
        ].forEach((name) => {
            this[name] = this[name].bind(this);
        });
    }

    handleMenu(event) {
        switch (event) {
            case 'about':
                this.toggleAboutModal();
                break;
            case 'callMeMaybe':
                this.toggleCallMeMaybeModal();
                break;
            case 'logOut':
                this.props.logout();
                break;
            case 'preview':
                this.props.preview();
                break;
            case 'settings':
                window.open('https://mdns.sipthor.net/sip_settings.phtml', '_blank');
                break;
            default:
                break;
        }
        document.activeElement.blur();
    }

    toggleMute() {
        this.setState(prevState => ({mute: !prevState.mute}));
        this.props.toggleMute();
    }

    toggleAboutModal() {
        this.setState({showAboutModal: !this.state.showAboutModal});
    }

    toggleCallMeMaybeModal() {
        this.setState({showCallMeMaybeModal: !this.state.showCallMeMaybeModal});
    }

    render() {
        const muteClasses = classNames({
            'fa'              : true,
            'fa-2x'           : true,
            'fa-bell-o'       : !this.state.mute,
            'fa-bell-slash-o' : this.state.mute,
            'text-warning'    : this.state.mute
        })
        return (
            <Navbar inverse={true} fixedTop={true} fluid={true}>
                <Navbar.Header>
                    <div className="navbar-blink-logo pull-left"></div>
                    <Navbar.Brand>
                        Sylk
                    </Navbar.Brand>
                    <p className="navbar-text hidden-xs">
                        Signed in as: <strong>{this.props.account.id}</strong>
                    </p>
                </Navbar.Header>
                <ButtonToolbar bsClass="btn-toolbar navbar-btn-toolbar pull-right">
                    <button title="Mute Incoming Ringtones" className="btn btn-link btn-fw" onClick={this.toggleMute}>
                        <i className={muteClasses}></i>
                    </button>
                    <DropdownButton id="blinkNavBar" pullRight bsStyle="link" onSelect={this.handleMenu} onClick={(e) => { e.preventDefault(); }} noCaret={true} title={<i className="fa fa-bars fa-2x"></i>}>
                        <MenuItem header>
                            <strong><i className="fa fa-user"></i> {this.props.account.id}</strong>
                        </MenuItem>
                        <MenuItem divider />
                        <MenuItem eventKey="callMeMaybe">
                            <i className="fa fa-share"></i> Call me, maybe?
                        </MenuItem>
                        <MenuItem eventKey="preview">
                            <i className="fa fa-video-camera"></i> Audio/Video Preview
                        </MenuItem>
                        <MenuItem eventKey="about">
                            <i className="fa fa-info-circle"></i> About
                        </MenuItem>
                        <MenuItem eventKey="settings">
                            <i className="fa fa-wrench"></i> Settings
                        </MenuItem>
                        <MenuItem eventKey="logOut">
                            <i className="fa fa-sign-out"></i> Sign Out
                        </MenuItem>
                    </DropdownButton>
                </ButtonToolbar>
                <AboutModal
                    show = {this.state.showAboutModal}
                    close = {this.toggleAboutModal}
                />
                <CallMeMaybeModal
                    show = {this.state.showCallMeMaybeModal}
                    close = {this.toggleCallMeMaybeModal}
                    callUrl = {this.callUrl}
                    notificationCenter = {this.props.notificationCenter}
                />
            </Navbar>
        );
    }
}

NavigationBar.propTypes = {
    notificationCenter : PropTypes.func.isRequired,
    account            : PropTypes.object.isRequired,
    logout             : PropTypes.func.isRequired,
    preview            : PropTypes.func.isRequired,
    toggleMute         : PropTypes.func.isRequired
};


module.exports = NavigationBar;
