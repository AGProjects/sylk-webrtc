'use strict';

const defaultDomain = 'sylk.link';

const configOptions = {
    defaultDomain           : defaultDomain,
    enrollmentDomain        : defaultDomain,
    nonSipDomains           : [],           // Each domain configured here will be used for alternate authentication methods
    publicUrl               : 'https://rtc.tangtalk.io/',
    // enrollmentUrl           : 'http://localhost:2334/enroll',
    enrollmentUrl           : 'https://blink.sipthor.net/enrollment-sylk-mobile.phtml',
    useServerCallHistory    : false,
    serverCallHistoryUrl    : 'https://blink.sipthor.net/settings-webrtc.phtml',
    defaultConferenceDomain : `basket.${defaultDomain}`,
    defaultGuestDomain      : `guest.${defaultDomain}`,
    wsServer                : 'wss://webrtc-gateway.sipthor.net:9999/webrtcgateway/ws',
    fileSharingUrl          : 'https://webrtc-gateway.sipthor.net:9999/webrtcgateway/filesharing',
    fileTransferUrl         : 'https://webrtc-gateway.sipthor.net:9999/webrtcgateway/filetransfer',
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
