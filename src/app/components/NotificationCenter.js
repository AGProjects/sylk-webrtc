'use strict';

const React              = require('react');
const NotificationSystem = require('react-notification-system');
const moment             = require('moment');
const Notify             = require('notifyjs');

const Mui               = require('material-ui');
const LinearProgress    = Mui.LinearProgress;

const config = require('../config');


class NotificationCenter extends React.Component {
    _postSystemNotification(title, options) {
        const n = new Notify(title, options);
        n.show();
        return n;
    }

    postSystemNotification(title, options={}) {    // eslint-disable-line space-infix-ops
        const defaultOptions = {
            icon: 'assets/images/blink-48.png',
            body: '',
            timeout: 5,
            silent: true
        }

        let ua = window.navigator.userAgent;
        let iOS = !!ua.match(/iPad/i) || !!ua.match(/iPhone/i);
        let webkit = !!ua.match(/WebKit/i);
        let android = !!ua.match(/Android/i);
        let chrome = !!ua.match(/Chrome/i);
        let iOSSafari = iOS && webkit && !ua.match(/CriOS/i);
        let chromeAndroid = android && chrome;
        if (!iOSSafari && !chromeAndroid) {
            if (Notify.needsPermission) {
                Notify.requestPermission(() => {
                    this._postSystemNotification(title, Object.assign({}, defaultOptions, options));
                });
            } else {
                this._postSystemNotification(title, Object.assign({}, defaultOptions, options));
            }
        }
    }

    postConferenceInvite(originator, room, cb) {
        if (originator.uri.endsWith(config.defaultGuestDomain)) {
            return;
        }
        const idx = room.indexOf('@');
        if (idx === -1) {
            return;
        }
        const currentDate = moment().format('MMMM Do YYYY [at] HH:mm:ss');
        const action = {
            label: 'Join',
            callback: () => { cb(room); }
        };
        this.refs.notificationSystem.addNotification({
            message: `${(originator.displayName || originator.uri)} invited you to join conference room ${room.substring(0, idx)}<br />On ${currentDate}`,
            title: 'Conference Invite',
            autoDismiss: 0,
            action: action,
            level: 'success',
            position: 'br'
        });
    }

    postMissedCall(originator, cb) {
        const currentDate = moment().format('MMMM Do YYYY [at] HH:mm:ss');
        let action;
        if (originator.uri.endsWith(config.defaultGuestDomain)) {
            action = null;
        } else {
            action = {
                label: 'Call',
                callback: () => { cb(originator.uri); }
            };
        }
        this.refs.notificationSystem.addNotification({
            message: `From ${(originator.displayName || originator.uri)} <br />On ${currentDate}`,
            title: 'Missed Call',
            autoDismiss: 0,
            action: action,
            level: 'info',
            position: 'br'
        });
    }

    postFileUploadProgress(filename, cb) {
        let progressNotification = this.refs.notificationSystem.addNotification({
            message: `${filename}`,
            title: 'Uploading file',
            autoDismiss: 0,
            level: 'info',
            position: 'br',
            onRemove: cb,
            children: (
                <div>
                    <LinearProgress
                        style={{marginTop: '2px'}}
                        classes={{barColorPrimary: 'blue-bar'}}
                        variant="determinate"
                        value={0}
                    />
                </div>
            )
        });
        return progressNotification
    }

    editFileUploadNotification(progress, notification) {
        if (progress === undefined) {
            progress = 100;
        }
        this.refs.notificationSystem.editNotification(notification, 
            {
                level: 'success',
                children: (
                    <div>
                        <LinearProgress
                            style={{marginTop: '2px'}}
                            classes={{barColorPrimary: 'blue-bar'}}
                            variant="determinate"
                            value={progress}
                        />
                    </div>
                )
            }
        );
    }

    removeFileUploadNotification(notification) {
        let timer = setTimeout(() => {
            this.refs.notificationSystem.removeNotification(notification);
        }, 3000);
    }

    removeNotification(notification) {
        this.refs.notificationSystem.removeNotification(notification);
    }

    postFileUploadFailed(filename) {
        this.refs.notificationSystem.addNotification({
            message: `Uploading of ${filename} failed`,
            title: 'File sharing failed',
            autoDismiss: 10  ,
            level: 'error',
            position: 'br'
        });
    }

    postFileShared(file, cb) {
        const uploader = file.uploader.displayName || file.uploader.uri || file.uploader;
        this.refs.notificationSystem.addNotification({
            message: `${uploader} shared ${file.filename}`,
            title: 'File shared',
            autoDismiss: 10,
            level: 'info',
            position: 'br',
            action: {
                label: 'Show Files',
                callback: () => { cb(); }
            }
        });
    }

    postNewMessage(message, cb) {
        const sender = message.sender.displayName || message.sender.uri;
        return this.refs.notificationSystem.addNotification({
            title: `Chat message from ${sender}`,
            autoDismiss: 10,
            level: 'info',
            position: 'bl',
            action: {
                label: 'Show Chat',
                callback: () => { cb(); }
            }
        });
    }

    postMutedOnStart() {
        this.refs.notificationSystem.addNotification({
            children: (<p style={{margin: '0 0 5px', textAlign: 'left'}}>You have been added to the conference with your audio muted. You can always unmute yourself when you are ready to speak.</p>),
            title: 'Your audio is muted',
            autoDismiss: 0,
            level: 'info',
            position: 'bc'
        });
    }

    render() {
        const style = {
              Containers: {
                  bc: {
                      width: '460px',
                      marginLeft: '-230px'
                  }
              }
        }

        return (
            <NotificationSystem ref="notificationSystem" allowHTML={true} style={style}/>
        );
    }
}


module.exports = NotificationCenter;
