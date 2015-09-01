'use strict';

import React from 'react';
import NotificationSystem from 'react-notification-system';

let Notifications = React.createClass({

    componentDidMount () {
        this._notificationSystem = this.refs.notificationSystem;
    },

    postNotification (level,title,message) {
        this._notificationSystem.addNotification({
            message: message,
            title: title,
            level: level,
            position: 'tc'
        });
    },

    render () {
        return (
            <div>
                <NotificationSystem ref="notificationSystem" />
            </div>
        );
    }
});

module.exports = Notifications;
