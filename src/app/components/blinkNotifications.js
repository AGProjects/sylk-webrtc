'use strict';

import React from 'react';
import NotificationSystem from 'react-notification-system';

var nn = class Notify extends React.Component {
    constructor () {
        super();
        this._notificationSystem = null;
        this._Notify = this._Notify.bind(this);
    }

    componentDidMount () {
        this._notificationSystem = this.refs.notificationSystem;
    }

    _Notify (level,title,message) {
        console.log(this.refs.notificationSystem);
        this._notificationSystem.addNotification({
            message: message,
            title: title,
            level: level,
            position: 'tc'
        });
    }

    render () {
        return (
            <div>
                <NotificationSystem ref="notificationSystem" />
            </div>
        );
    }
}

module.exports = nn;
