'use strict';

const React          = require('react');
const ReactBootstrap = require('react-bootstrap');
const Dropdown       = ReactBootstrap.Dropdown;
const MenuItem       = ReactBootstrap.MenuItem;
const classNames     = require('classnames');
const Router         = require('react-mini-router');
const navigate       = Router.navigate;
const timers         = require('timers');


let SettingsBox = React.createClass({
    propTypes: {
        account   : React.PropTypes.object.isRequired,
        guestMode : React.PropTypes.bool
    },

    handleMenu: function(event, data) {
        if (event === 'logOut') {
            timers.setImmediate(() => {
                navigate('/logout');
            });
        }
    },

    render: function() {
        let registrationClasses = classNames({
            'btn-link': true,
            'text-registered' : this.props.account.registrationState === 'registered',
            'text-danger'     : this.props.account.registrationState !== 'registered'
        });
        let preventDefault = e => e.preventDefault();

        return (
            <div className="settings">
                <span className={registrationClasses}></span>
                {!this.props.guestMode &&
                <Dropdown pullRight onSelect={this.handleMenu} id="dropdown-custom-1">
                    <button bsRole="toggle" onClick={preventDefault} className={registrationClasses}>
                        <i className="fa fa-cogs fa-2x"></i>
                    </button>
                    <Dropdown.Menu>
                        <MenuItem header><strong><i className="fa fa-user"></i> {this.props.account.id}</strong></MenuItem>
                        <MenuItem divider />
                        <MenuItem eventKey="settings" target="_blank" href="https://mdns.sipthor.net/sip_settings.phtml"><i className="fa fa-wrench"></i> Settings</MenuItem>
                        <MenuItem eventKey="logOut"><i className="fa fa-sign-out"></i> Sign Out</MenuItem>
                    </Dropdown.Menu>
                </Dropdown>
                }

                {this.props.guestMode &&
                <Dropdown pullRight onSelect={this.handleMenu} id="dropdown-custom-1">
                    <button className="btn-link text-white" bsRole="toggle" onClick={preventDefault}>
                        <i className="fa fa-cogs fa-2x"></i>
                    </button>
                    <Dropdown.Menu>
                        <MenuItem header><strong><i className="fa fa-user"></i> {this.props.account.id}</strong></MenuItem>
                        <MenuItem divider />
                        <MenuItem eventKey="logOut"><i className="fa fa-sign-out"></i> Sign Out</MenuItem>
                    </Dropdown.Menu>
                </Dropdown>
                }
            </div>
        );
    }
});

module.exports = SettingsBox;
