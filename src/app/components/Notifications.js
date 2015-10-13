'use strict';

const React              = require('react');
const NotificationSystem = require('react-notification-system');
const moment             = require('moment');


let Notifications = React.createClass({
    componentDidMount: function() {
        this._notificationSystem = this.refs.notificationSystem;
    },

    postNotification: function(level, title, message) {
        this._notificationSystem.addNotification({
            message: message,
            title: title,
            level: level,
            position: 'tc'
        });
    },

    postMissedCall: function(originator, call) {
        let currentDate = moment().format('MMMM Do YYYY [at] HH:mm:ss');
        this._notificationSystem.addNotification({
            message: 'From '+ originator + '<br />On ' + currentDate,
            title: 'Missed Call',
            autoDismiss: 0,
            action: {
                label: 'Call',
                callback: function() {
                    call(originator);
                }
            },
            level: 'info',
            position: 'tc'
        });
    },

    render: function() {
        return (
            <div>
                <NotificationSystem ref="notificationSystem" allowHTML={true} />
            </div>
        );
    }
});

module.exports = Notifications;
