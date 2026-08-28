'use strict';

// Ingestion adapter for the `application/sylk-location-sharing` wire format.
// A share is a CLEARTEXT lifecycle envelope with a single PGP-encrypted
// `value`. sylkrtc decrypts the coordinates in the lib
// (Account._handleEvent -> locationSharing.decryptInPlace) and populates
// `message.json` with one whole envelope (its `value` is the decrypted coords
// as a JSON string), so this module only parses shapes — no decryption, no async.
//
// Payload v2+: envelope rides in the wire metadata, content is the bare
// blob. sylkrtc's lib/locationSharing.js handles the split both ways, so
// this module and everything below it sees one shape regardless of version.
//
// This module is pure translation: envelope -> a normalized event whose `json`
// is fed to the existing location reducer (./locationTrail applyLocationEvent).
// It mirrors the mobile live-receive split in sylk-mobile/app/app.js so the two
// interoperate.

// Wire actions that carry an encrypted `value` (coordinates).
const COORD_ACTIONS = new Set([
    'location_once', 'location_start', 'location_update',
    'meeting_request', 'meeting_start', 'meeting_update'
]);
// Wire actions that carry NO value (pure lifecycle signals). Keys are the
// on-the-wire (snake_case) action names, quoted to keep eslint's camelcase
// rule off the wire vocabulary.
const SIGNAL_KIND = {
    'location_stop': 'stop',
    'meeting_end': 'end',
    'meeting_reject': 'reject',
    'location_request': 'request',
    'meeting_accept': 'accept'
};
const UPDATE_ACTIONS = new Set(['location_update', 'meeting_update']);
const MEET_ACTIONS = new Set(['meeting_request', 'meeting_start', 'meeting_update']);

// Split a `value` plaintext into { coords, destination }. The value arrives
// already decrypted — sylkrtc decrypts it in the lib (see Account._handleEvent)
// before this module ever sees the envelope, so there is no decryption
// happening here, only parsing/shape-detection.
// Bare coords: { latitude, longitude, ... }. Wrapped (meet w/ destination):
// { value: { latitude, ... }, destination: { latitude, ... } }.
function splitLocationValue(plain) {
    let dec = null;
    try { dec = typeof plain === 'string' ? JSON.parse(plain) : plain; } catch (e) { return { coords: null, destination: null }; }
    if (dec && typeof dec.latitude === 'number') {
        return { coords: dec, destination: null };
    }
    if (dec && dec.value && typeof dec.value.latitude === 'number') {
        const destination = (dec.destination && typeof dec.destination.latitude === 'number')
            ? dec.destination : null;
        return { coords: dec.value, destination };
    }
    return { coords: null, destination: null };
}

// Translate a wire envelope into a normalized location event.
//
//   wire       : the parsed cleartext envelope (parseEnvelope output)
//   opts.senderUri, opts.messageId, opts.messageTimestamp, opts.direction
//
// Returns:
//   {
//     kind: 'coords'|'stop'|'end'|'reject'|'request'|'accept',
//     sessionId, direction, role, meet, oneShot, uri,
//     json: { kind, value, destination, expires, role, reason, meet, oneShot,
//             direction, messageId, metadataId, timestamp }
//   }
// or null if the envelope is unusable / a coord tick failed to decrypt.
function toLocationEvent(wire, opts = {}) {
    if (!wire || typeof wire.action !== 'string') return null;
    const action = wire.action;
    const direction = opts.direction || 'incoming';
    const envelopeId = opts.messageId;
    const messageTimestamp = opts.messageTimestamp;
    const uri = opts.senderUri;

    // sessionId groups a session (== bubble id). Legacy messageId honoured as
    // a fallback; a one-shot omits sessionId (its session == the envelope id).
    const sessionId = wire.sessionId || wire.messageId || envelopeId;
    const meet = MEET_ACTIONS.has(action) || !!wire.role || wire.meeting_request === true;
    const oneShot = action === 'location_once';
    const isUpdate = UPDATE_ACTIONS.has(action);
    const metadataId = wire.metadataId != null ? wire.metadataId : (isUpdate ? sessionId : null);
    // On the desktop the reliable own/peer discriminator is direction (own
    // coordinates arrive as outgoing sibling carbons from the phone); role is
    // carried through for completeness / the inviter-vs-invited label.
    let role = wire.role;
    if (!role && meet) role = wire.meeting_request === true || action === 'meeting_request' ? 'inviter' : 'invited';

    // Coordinate-free lifecycle signals: no decryption, no coords.
    if (SIGNAL_KIND[action]) {
        const kind = SIGNAL_KIND[action];
        return {
            kind, sessionId, direction, role, meet, oneShot: false, uri,
            json: {
                kind, value: null, destination: null, expires: wire.expires || null,
                role, reason: wire.reason || null, meet, oneShot: false,
                direction, messageId: sessionId, metadataId: null,
                requestId: wire.requestId || null,
                timestamp: wire.timestamp || messageTimestamp
            }
        };
    }

    if (!COORD_ACTIONS.has(action)) return null;
    if (typeof wire.value !== 'string') return null;
    const { coords, destination } = splitLocationValue(wire.value);

    if (!coords || typeof coords.latitude !== 'number' || typeof coords.longitude !== 'number') {
        return null;
    }
    const timestamp = coords.timestamp || wire.timestamp || messageTimestamp;

    return {
        kind: 'coords', sessionId, direction, role, meet, oneShot, uri,
        json: {
            kind: 'coords',
            value: {
                latitude: coords.latitude,
                longitude: coords.longitude,
                accuracy: typeof coords.accuracy === 'number' ? coords.accuracy : null,
                timestamp: timestamp
            },
            destination: destination
                ? { latitude: destination.latitude, longitude: destination.longitude }
                : null,
            expires: wire.expires || null,
            role, reason: null, meet, oneShot,
            direction, messageId: sessionId, metadataId,
            requestId: wire.requestId || null,
            timestamp
        }
    };
}

function getCurrentPosition() {
    return new Promise((resolve, reject) => {
        if (!navigator.geolocation) {
            reject(new Error('Geolocation not supported'));
            return;
        }
        navigator.geolocation.getCurrentPosition(
            (pos) => resolve({
                latitude: pos.coords.latitude,
                longitude: pos.coords.longitude,
                accuracy: pos.coords.accuracy,
                timestamp: pos.timestamp
            }),
            (err) => reject(err),
            { enableHighAccuracy: true, timeout: 10000 }
        );
    });
}

exports.getCurrentPosition = getCurrentPosition;
exports.splitLocationValue = splitLocationValue;
exports.toLocationEvent = toLocationEvent;
