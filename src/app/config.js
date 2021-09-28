'use strict';

const defaultDomain = 'sylk.link';

const configOptions = {
    defaultDomain           : defaultDomain,
    enrollmentDomain        : defaultDomain,
    nonSipDomains           : [],           // Each domain configured here will be used for alternate authentication methods
    publicUrl               : 'https://webrtc.sipthor.net',
    enrollmentUrl           : 'https://blink.sipthor.net/enrollment-sylk-mobile.phtml',
    useServerCallHistory    : true,
    serverCallHistoryUrl    : 'https://blink.sipthor.net/settings-webrtc.phtml',
    defaultConferenceDomain : `videoconference.sip2sip.info`,
    defaultGuestDomain      : `guest.${defaultDomain}`,
    wsServer                : 'wss://webrtc-gateway.sipthor.net:9999/webrtcgateway/ws',
    fileSharingUrl          : 'https://webrtc-gateway.sipthor.net:9999/webrtcgateway/filesharing',
    iceServers              : [{urls: 'stun:stun.sipthor.net:3478'}],
    muteGuestAudioOnJoin    : false,
    guestUserPermissions    : {
        allowMuteAllParticipants     : false,
        allowToggleHandsParticipants : false
    },
    showGuestCompleteScreen : true,
    downloadUrl             : 'https://sylkserver.com'
};


module.exports = configOptions;
