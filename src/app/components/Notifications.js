'use strict';

const React              = require('react');
const NotificationSystem = require('react-notification-system');


let Notifications = React.createClass({
    componentDidMount: function() {
        this._notificationSystem = this.refs.notificationSystem;
    },

    postNotification: function(level,title,message) {
        this._notificationSystem.addNotification({
            message: message,
            title: title,
            level: level,
            position: 'tc'
        });
    },

    render: function() {
        return (
            <div>
                <NotificationSystem ref="notificationSystem" />
            </div>
        );
    }
});

module.exports = Notifications;
