'use strict';

const configOptions = {
    defaultDomain           : 'sip2sip.info',
    defaultConferenceDomain : 'conference.sip2sip.info',
    wsServer                : 'wss://webrtc-gateway.sipthor.net:8888/webrtcgateway/ws',
    iceServers              : [{urls: 'stun:stun.l.google.com:19302'}]
};

module.exports = configOptions;
