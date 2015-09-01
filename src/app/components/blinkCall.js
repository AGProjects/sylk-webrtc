'use strict';

import React from 'react';
import {Dropdown,MenuItem} from 'react-bootstrap';

var Idle = React.createClass({
    getInitialState() {
        return {targetUri: '',
                callState: null
        };
    },

    handleTargetChange(event) {
        this.setState({targetUri: event.target.value});
    },

    handleSubmit(event) {
        event.preventDefault();
        // if (this.state.call === null) {
        this.props.startCall(this.state.targetUri);
    },

    handleMenu(event,data2) {
        this.props.signOut();
    },

    render() {
        var classNames = require('classnames');
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
                                <input type='email' id="inputDestination" className="form-control"
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
