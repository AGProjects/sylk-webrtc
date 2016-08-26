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
const timers         = require('timers');
const Clipboard      = require('clipboard');

const config = require('../config');
const utils  = require('../utils');


const NavigationBar = (props) => {
    const handleMenu = (event) => {
        if (event === 'logOut') {
            timers.setImmediate(() => {
                navigate('/logout');
            });
        } else if (event === 'about') {
            props.showAbout();
        }
    };

    const handleClipboardButton = function() {
        utils.postNotification('Call me, maybe?', {body: 'URL copied to the clipboard'});
    };

    const clipboard = new Clipboard('.btn');
    let callUrl;
    if (window.location.origin.startsWith('file://')) {
        callUrl = `${config.publicUrl}/#!/call/${props.account.id}`;
    } else {
        callUrl = `${window.location.origin}/#!/call/${props.account.id}`;
    }
    const shareOverlay = (
        <Popover id="shareOverlay" title="Call me, maybe?">
            Share <strong><a href={callUrl} target="_blank" rel="noopener noreferrer">this link</a></strong> with others so they can easily call you.
            <div className="text-center">
                <button className="btn btn-link" onClick={handleClipboardButton} data-clipboard-text={callUrl}>
                    <strong>Copy to clipboard</strong>
                </button>
            </div>
        </Popover>
    );

    const preventDefault = (e) => {
        e.preventDefault();
    };

    return (
        <Navbar inverse={true} fixedTop={true}>
            <Navbar.Header>
                <div className="navbar-blink-logo pull-left"></div>
                <Navbar.Brand>
                    Blink
                </Navbar.Brand>
                <p className="navbar-text hidden-xs">
                    Signed in as: <strong>{props.account.id}</strong>
                </p>
            </Navbar.Header>
            <ButtonToolbar bsClass="btn-toolbar navbar-btn-toolbar pull-right">
                <OverlayTrigger trigger="click" placement="bottom" overlay={shareOverlay} rootClose>
                    <Button bsStyle="link">
                        <i className="fa fa-share fa-2x"></i>
                    </Button>
                </OverlayTrigger>
                <DropdownButton id="blinkNavBar" pullRight bsStyle="link" onSelect={handleMenu} onClick={preventDefault} noCaret={true} title={<i className="fa fa-bars fa-2x"></i>}>
                    <MenuItem header>
                        <strong><i className="fa fa-user"></i> {props.account.id}</strong>
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

NavigationBar.propTypes = {
    account: React.PropTypes.object.isRequired,
    showAbout : React.PropTypes.func.isRequired
};


module.exports = NavigationBar;
