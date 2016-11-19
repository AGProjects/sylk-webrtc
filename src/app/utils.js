'use strict';


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


// partially borrowed from clipboard.js
// Must call it from a click event handler
// returns true if the text was copied, false otherwise

function copyToClipboard(text) {
    const isRTL = document.documentElement.getAttribute('dir') == 'rtl';
    const fakeElem = document.createElement('textarea');
    let success = true;

    // Prevent zooming on iOS
    fakeElem.style.fontSize = '12pt';
    // Reset box model
    fakeElem.style.border = '0';
    fakeElem.style.padding = '0';
    fakeElem.style.margin = '0';
    // Move element out of screen horizontally
    fakeElem.style.position = 'absolute';
    fakeElem.style[ isRTL ? 'right' : 'left' ] = '-9999px';
    // Move element to the same position vertically
    fakeElem.style.top = (window.pageYOffset || document.documentElement.scrollTop) + 'px';
    fakeElem.setAttribute('readonly', '');
    fakeElem.value = text;
    // Add element to the body
    document.body.appendChild(fakeElem);
    // Select the element
    fakeElem.select();
    // Copy to clipboard
    try {
        document.execCommand('copy');
    } catch(e) {
        success = false;
    }
    // De-select the element
    fakeElem.blur();
    // Remove from body
    document.body.removeChild(fakeElem);

    return success;
}

// TODO: DRY this (it's also present in sylkrtc)
//
function closeMediaStream(stream) {
    if (!stream) {
        return;
    }

    // Latest spec states that MediaStream has no stop() method and instead must
    // call stop() on every MediaStreamTrack.
    if (MediaStreamTrack && MediaStreamTrack.prototype && MediaStreamTrack.prototype.stop) {
        if (stream.getTracks) {
            for (let track of stream.getTracks()) {
                track.stop();
            }
        } else {
            for (let track of stream.getAudioTracks()) {
                track.stop();
            }

            for (let track of stream.getVideoTracks()) {
                track.stop();
            }
        }
    // Deprecated by the spec, but still in use.
    } else if (typeof stream.stop === 'function') {
        stream.stop();
    }
}


exports.copyToClipboard = copyToClipboard;
exports.normalizeUri = normalizeUri;
exports.closeMediaStream = closeMediaStream;
