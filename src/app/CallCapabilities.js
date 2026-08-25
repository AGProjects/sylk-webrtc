'use strict';

// ---------------------------------------------------------------------
// What THIS build claims it can do, in a call
// ---------------------------------------------------------------------
//
// The advertisement itself -- content type, wire format, sending it on
// 'established', consuming the peer's -- lives in sylkrtc's Call
// (setLocalCapabilities / peerCapabilities / peerSupports() / the
// 'capabilitiesChanged' event). What is left here is the part the
// library cannot know: WHICH tokens this particular build honours, and
// on which calls it is worth saying so at all.
//
// The token vocabulary is shared with sylk-mobile. Keep these values
// stable once shipped -- they are wire values, not internal names.
//
// Advertise only what this build actually implements. Every token is a
// promise the peer will hold us to: it enables a control on their side
// that sends us something we then have to answer. A build that claims a
// feature it does not run is what produces a button that does nothing.

const config = require('./config');
const utils = require('./utils');

// Can capture and transmit its own screen in place of the camera.
const CAP_SCREEN_SHARING = 'screen-sharing';
// Understands the request / request_accept / request_reject handshake
// carried on application/sylk-screen-sharing. Gates the peer's
// "Request screen" control: we only let them ask if we will answer.
const CAP_SCREEN_REQUEST = 'screen-request';
// Remote-pointer guidance protocol (application/sylk-pointer): we can
// draw the guide points the peer sends onto the screen we are sharing.
const CAP_POINTER = 'pointer';
// In-call "escalate this call to a conference" metadata handshake.
// NOT advertised by this build -- see myCallCapabilities.
const CAP_CONFERENCE_REQUEST = 'conference-request';

// Electron exposes node's require on window; the browser build does
// not. Same test guideMarker.js uses, and for the same reason.
const isElectron = typeof window !== 'undefined' && window.require !== undefined;

/**
 * What THIS build can do.
 *
 * screen-sharing / screen-request are unconditional: both the Electron
 * and the browser build can capture a screen (desktopCapturer and
 * getDisplayMedia respectively) and both run the receiver side of the
 * request handshake in app.js.
 *
 * pointer is Electron-only, and that is the whole reason this is a
 * function and not a constant. Drawing the peer's guide point means
 * painting something that lands INSIDE our own capture; only Electron
 * can do that, via the transparent always-on-top overlay window on the
 * shared display (see guideMarker.js). A browser page can only paint
 * inside itself, so a marker would reach the capture in the single
 * accidental case where a whole screen is shared with our window
 * visible on it, and never for a shared tab or another application's
 * window. The web build therefore declares itself unpointable and peers
 * keep their pointer button hidden for our shares.
 *
 * conference-request is deliberately absent: this build escalates to a
 * conference by hanging up and dialling a room (app.js
 * escalateToConference), with no in-call metadata handshake for the
 * peer to take part in.
 */
function myCallCapabilities() {
    const capabilities = [
        CAP_SCREEN_SHARING,
        CAP_SCREEN_REQUEST
    ];
    if (isElectron) {
        capabilities.push(CAP_POINTER);
    }
    return capabilities;
}

/** True when this call's remote party is a PSTN destination (a dialled
 *  phone number) rather than a SIP/Sylk client. The account's
 *  configured conference domain is forwarded to utils.isPhoneNumber so
 *  an all-digit conference room can't be mistaken for a number. */
function isPstnCall(call) {
    const uri = call && call.remoteIdentity && call.remoteIdentity.uri;
    if (typeof uri !== 'string' || !uri) {
        return false;
    }
    try {
        return !!utils.isPhoneNumber(uri, config.defaultConferenceDomain);
    } catch (e) {
        // Never let a URI-parsing edge case block the advertisement on a
        // legitimate SIP call -- fail open, the peer just ignores an
        // unknown content type.
        return false;
    }
}

/**
 * Declare our capabilities on `call`. sylkrtc advertises them by itself
 * once the call is established, so this only has to run at some point
 * before then.
 *
 * Skipped for PSTN destinations: there is no client on the far end to
 * read the advertisement, and the message would land in a SIP trunk or
 * gateway that has no reason to understand it. Because every
 * capability-gated control keys off the peer's advertisement, and a
 * gateway can't send one, those controls stay hidden on PSTN calls
 * automatically -- no separate check at the UI layer.
 */
function declareCallCapabilities(call) {
    if (!call || typeof call.setLocalCapabilities !== 'function') {
        return;
    }
    if (isPstnCall(call)) {
        return;
    }
    call.setLocalCapabilities(myCallCapabilities());
}

exports.CAP_SCREEN_SHARING = CAP_SCREEN_SHARING;
exports.CAP_SCREEN_REQUEST = CAP_SCREEN_REQUEST;
exports.CAP_POINTER = CAP_POINTER;
exports.CAP_CONFERENCE_REQUEST = CAP_CONFERENCE_REQUEST;
exports.isElectron = isElectron;
exports.myCallCapabilities = myCallCapabilities;
exports.declareCallCapabilities = declareCallCapabilities;
