'use strict';

const React              = require('react');
const NotificationSystem = require('react-notification-system');
const moment             = require('moment');


class Notifications extends React.Component {
    postNotification(level, title, message, dismiss=5) {
        this.refs.notificationSystem.addNotification({
            message: message,
            title: title,
            level: level,
            autoDismiss: dismiss,
            position: 'tc'
        });
    }

    postMissedCall(originator, call) {
        let currentDate = moment().format('MMMM Do YYYY [at] HH:mm:ss');
        this.refs.notificationSystem.addNotification({
            message: 'From ' + (originator.displayName || originator.uri) + '<br />On ' + currentDate,
            title: 'Missed Call',
            autoDismiss: 0,
            action: {
                label: 'Call',
                callback: function() {
                    call(originator.uri);
                }
            },
            level: 'info',
            position: 'tr'
        });
    }

    render() {
        return (
            <div>
                <NotificationSystem ref="notificationSystem" allowHTML={true} />
            </div>
        );
    }
}


module.exports = Notifications;
