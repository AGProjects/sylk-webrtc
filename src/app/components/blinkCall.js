'use strict';

const React          = require('react');
const ReactBootstrap = require('react-bootstrap');
const Dropdown       = ReactBootstrap.Dropdown;
const MenuItem       = ReactBootstrap.MenuItem;
const classNames     = require('classnames');


let Idle = React.createClass({
    getInitialState: function() {
        return {targetUri: '',
                callState: null
        };
    },

    handleTargetChange: function(event) {
        this.setState({targetUri: event.target.value});
    },

    handleSubmit: function(event) {
        event.preventDefault();
        let targetUri = this.state.targetUri;
        if (targetUri.indexOf('@') === -1) {
            // take the domain part from the account
            const domain = this.props.account.id.substring(this.props.account.id.indexOf('@') + 1);
            targetUri += '@' + domain;
        }
        this.props.startCall(targetUri);
    },

    handleMenu: function(event,data2) {
        this.props.signOut();
    },

    render: function() {
        let classes = classNames({
            'btn'         : true,
            'btn-lg'      : true,
            'btn-success' : this.state.targetUri.length !== 0,
            'btn-warning' : this.state.targetUri.length === 0,
        });
        let registrationClasses = classNames({
            'success' : this.props.account.registrationState === 'registered',
            'danger'  : this.props.account.registrationState !== 'registered',
        });
        return (
            <div>
                <div className="cover-container">
                    <div className="inner cover">
                        <div className='blink_logo'></div><br/>
                        <form className="form-dial" name='DialForm' onSubmit={this.handleSubmit}>
                            <p className='lead'>Enter the address you wish to call</p>
                            <div className="input-group input-group-lg">
                                <input type='text' id="inputDestination" className="form-control"
                                    onChange={this.handleTargetChange}
                                    value={this.state.targetUri}
                                    required autofocus />
                                <span className="input-group-btn">
                                    <button type="submit" className={classes} disabled={this.state.targetUri.length === 0}><i className='fa fa-phone'></i></button>
                                </span>
                            </div>
                        </form>
                    </div>
                </div>
                <div className='settings'>
                     <span className={registrationClasses}></span>
                      <Dropdown pullRight onSelect={this.handleMenu} id='dropdown-custom-1'>
                        <Dropdown.Toggle noCaret bsStyle={registrationClasses}>
                          <i className='fa fa-cogs'></i>
                        </Dropdown.Toggle>
                        <Dropdown.Menu>
                          <MenuItem header><strong><i className='fa fa-user'></i> {this.props.account.id}</strong></MenuItem>
                          <MenuItem eventKey='logOut'><i className="fa fa-sign-out"></i> Sign Out</MenuItem>
                        </Dropdown.Menu>
                      </Dropdown>
                </div>
            </div>
        );
    }
});

module.exports = Idle;
