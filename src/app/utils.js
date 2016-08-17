'use strict';

const Notify = require('notifyjs').default;


function normalizeUri(uri, defaultDomain) {
    let targetUri = uri;
    let idx = targetUri.indexOf('@');
    let username;
    let domain;
    if (idx !== -1) {
        username = targetUri.substring(0, idx);
        domain = targetUri.substring(idx + 1);
    } else {
        username = targetUri;
        domain = defaultDomain;
    }
    username = username.replace(/[\s()-]/g, '');
    return `${username}@${domain}`;
}


function _postNotification(title, options) {
    const n = new Notify(title, options);
    n.show();
    return n;
}

function postNotification(title, text='', timeout=5) {    // eslint-disable-line space-infix-ops
    let options = {
        icon: '/assets/images/blink-48.png',
        body: text || '',
        timeout: timeout
    };
    if (Notify.needsPermission) {
        Notify.requestPermission(() => {
            _postNotification(title, options);
        });
    } else {
        _postNotification(title, options);
    }
}


exports.normalizeUri = normalizeUri;
exports.postNotification = postNotification;
