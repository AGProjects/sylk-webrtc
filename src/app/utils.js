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

function postNotification(title, options={}) {    // eslint-disable-line space-infix-ops
    const defaultOptions = {
        icon: 'assets/images/blink-48.png',
        body: '',
        timeout: 5,
        silent: true
    }
    if (Notify.needsPermission) {
        Notify.requestPermission(() => {
            _postNotification(title, Object.assign({}, defaultOptions, options));
        });
    } else {
        _postNotification(title, Object.assign({}, defaultOptions, options));
    }
}


exports.normalizeUri = normalizeUri;
exports.postNotification = postNotification;
