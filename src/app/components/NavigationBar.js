'use strict';

const React          = require('react');
const classNames     = require('classnames');
const ReactBootstrap = require('react-bootstrap');
const Navbar         = ReactBootstrap.Navbar;
const Nav            = ReactBootstrap.Nav;
const DropdownButton = ReactBootstrap.DropdownButton;
const MenuItem       = ReactBootstrap.MenuItem;
const OverlayTrigger = ReactBootstrap.OverlayTrigger;
const Popover        = ReactBootstrap.Popover;
const Button         = ReactBootstrap.Button;
const ButtonToolbar  = ReactBootstrap.ButtonToolbar;
const Router         = require('react-mini-router');
const navigate       = Router.navigate;
const Clipboard      = require('clipboard');

const config = require('../config');
const utils  = require('../utils');


class NavigationBar extends React.Component {
    constructor(props) {
        super(props);

        this.clipboard = new Clipboard('#shareBtn');
        if (window.location.origin.startsWith('file://')) {
            this.callUrl = `${config.publicUrl}/#!/call/${props.account.id}`;
        } else {
            this.callUrl = `${window.location.origin}/#!/call/${props.account.id}`;
        }

        // ES6 classes no longer autobind
        [
            'handleClipboardButton',
            'handleMenu'
        ].forEach((name) => {
            this[name] = this[name].bind(this);
        });
    }

    componentWillUnmount() {
        this.clipboard.destroy();
        this.clipboard = null;
    }

    handleClipboardButton() {
        utils.postNotification('Call me, maybe?', {body: 'URL copied to the clipboard'});
        this.refs.shareOverlay.hide();
    }

    handleMenu(event) {
        if (event === 'logOut') {
            setTimeout(() => {
                navigate('/logout');
            });
        } else if (event === 'about') {
            this.props.showAbout();
        }
    }

    render() {
        const shareOverlay = (
            <Popover id="shareOverlay" title="Call me, maybe?">
                Share <strong><a href={this.callUrl} target="_blank" rel="noopener noreferrer">this link</a></strong> with others so they can easily call you.
                <div className="text-center">
                    <button id="shareBtn" className="btn btn-link" onClick={this.handleClipboardButton} data-clipboard-text={this.callUrl}>
                        <strong>Copy to clipboard</strong>
                    </button>
                </div>
            </Popover>
        );

        return (
            <Navbar inverse={true} fixedTop={true}>
                <Navbar.Header>
                    <div className="navbar-blink-logo pull-left"></div>
                    <Navbar.Brand>
                        Blink
                    </Navbar.Brand>
                    <p className="navbar-text hidden-xs">
                        Signed in as: <strong>{this.props.account.id}</strong>
                    </p>
                </Navbar.Header>
                <ButtonToolbar bsClass="btn-toolbar navbar-btn-toolbar pull-right">
                    <OverlayTrigger ref="shareOverlay" trigger="click" placement="bottom" overlay={shareOverlay} rootClose>
                        <Button bsStyle="link">
                            <i className="fa fa-share fa-2x"></i>
                        </Button>
                    </OverlayTrigger>
                    <DropdownButton id="blinkNavBar" pullRight bsStyle="link" onSelect={this.handleMenu} onClick={(e) => { e.preventDefault(); }} noCaret={true} title={<i className="fa fa-bars fa-2x"></i>}>
                        <MenuItem header>
                            <strong><i className="fa fa-user"></i> {this.props.account.id}</strong>
                        </MenuItem>
                        <MenuItem divider />
                        <MenuItem eventKey="about">
                            <i className="fa fa-info-circle"></i> About
                        </MenuItem>
                        <MenuItem eventKey="settings" target="_blank" href="https://mdns.sipthor.net/sip_settings.phtml">
                            <i className="fa fa-wrench"></i> Settings
                        </MenuItem>
                        <MenuItem eventKey="logOut">
                            <i className="fa fa-sign-out"></i> Sign Out
                        </MenuItem>
                    </DropdownButton>
                </ButtonToolbar>
            </Navbar>
        );
    }
}

NavigationBar.propTypes = {
    account: React.PropTypes.object.isRequired,
    showAbout : React.PropTypes.func.isRequired
};


module.exports = NavigationBar;
