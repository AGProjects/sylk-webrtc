'use strict';

const defaultDomain = 'sip2sip.info';

const configOptions = {
    defaultDomain           : defaultDomain,
    enrollmentDomain        : defaultDomain,
    publicUrl               : 'https://webrtc.sipthor.net',
    enrollmentUrl           : 'https://blink.sipthor.net/enrollment-webrtc.phtml',
    defaultConferenceDomain : `videoconference.${defaultDomain}`,
    defaultGuestDomain      : `guest.${defaultDomain}`,
    wsServer                : 'wss://webrtc-gateway.sipthor.net:9999/webrtcgateway/ws',
    iceServers              : [{urls: 'stun:stun.l.google.com:19302'}, {urls: 'turn:node15.sipthor.net', username: 'blink', credential: 'w3bRtC'}]
};


module.exports = configOptions;
