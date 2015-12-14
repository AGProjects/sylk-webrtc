'use strict';

const configOptions = {
    enrollmentDomain        : 'sip2sip.info',
    enrollmentUrl           : 'https://blink.sipthor.net/enrollment-webrtc.phtml',
    defaultConferenceDomain : 'conference.sip2sip.info',
    defaultGuestDomain      : 'guest.sip2sip.info',
    wsServer                : 'wss://webrtc-gateway.sipthor.net:8888/webrtcgateway/ws',
    iceServers              : [{urls: 'stun:stun.l.google.com:19302'}]
};

module.exports = configOptions;
