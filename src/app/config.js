'use strict';

const defaultDomain = 'sip2sip.info';

const configOptions = {
    defaultDomain           : defaultDomain,
    enrollmentDomain        : defaultDomain,
    nonSipDomains           : [],           // Each domain configured here will be used for alternate authentication methods
    publicUrl               : 'https://webrtc.sipthor.net',
    enrollmentUrl           : 'https://blink.sipthor.net/enrollment-webrtc.phtml',
    useServerCallHistory    : true,
    serverCallHistoryUrl    : 'https://blink.sipthor.net/settings-webrtc.phtml',
    defaultConferenceDomain : `videoconference.${defaultDomain}`,
    defaultGuestDomain      : `guest.${defaultDomain}`,
    wsServer                : 'wss://webrtc-gateway.sipthor.net:9999/webrtcgateway/ws',
    fileSharingUrl          : 'https://webrtc-gateway.sipthor.net:9999/webrtcgateway/filesharing',
    iceServers              : [{urls: 'stun:stun.sipthor.net:3478'}],
    muteGuestAudioOnJoin    : true,
    guestUserPermissions    : {
        allowMuteAllParticipants     : false,
        allowToggleHandsParticipants : false
    }
};


module.exports = configOptions;
