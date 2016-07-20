'use strict';

const React              = require('react');
const NotificationSystem = require('react-notification-system');
const moment             = require('moment');

const config = require('../config');


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
        let action;
        if (originator.uri.endsWith(config.defaultGuestDomain)) {
            action = null;
        } else {
            action = {
                label: 'Call',
                callback: function() { call(originator.uri); }
            };
        }
        this.refs.notificationSystem.addNotification({
            message: `From ${(originator.displayName || originator.uri)} <br />On ${currentDate}`,
            title: 'Missed Call',
            autoDismiss: 0,
            action: action,
            level: 'info',
            position: 'tr'
        });
    }

    render() {
        return (
            <NotificationSystem ref="notificationSystem" allowHTML={true} />
        );
    }
}


module.exports = Notifications;
