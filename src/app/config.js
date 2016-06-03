'use strict';

const defaultDomain = 'sip2sip.info';

const configOptions = {
    defaultDomain           : defaultDomain,
    enrollmentDomain        : defaultDomain,
    enrollmentUrl           : 'https://blink.sipthor.net/enrollment-webrtc.phtml',
    defaultConferenceDomain : `conference.${defaultDomain}`,
    defaultGuestDomain      : `guest.${defaultDomain}`,
    wsServer                : 'wss://webrtc-gateway.sipthor.net:8888/webrtcgateway/ws',
    iceServers              : [{urls: 'stun:stun.l.google.com:19302'}, {urls: 'turn:node15.sipthor.net', username: 'blink', credential: 'w3bRtC'}]
};


module.exports = configOptions;
