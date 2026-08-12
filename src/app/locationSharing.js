'use strict';

// Ingestion adapter for the `application/sylk-location-sharing` wire format
// (mobile v1). A share is a CLEARTEXT lifecycle envelope with a single
// PGP-encrypted `value` (the coordinates). sylkrtc does NOT decrypt this type
// (the body is a JSON object, not a bare PGP block) and does NOT populate
// `message.json` for it, so the desktop parses the envelope here and decrypts
// only `value`.
//
// This module is pure translation: envelope -> a normalized event whose `json`
// is fed to the existing location reducer (./locationTrail applyLocationEvent).
// It mirrors the mobile live-receive split in sylk-mobile/app/app.js so the two
// interoperate. See docs/messages/sylk-location-sharing-v1.md for the spec (the
// wire here follows the actual mobile code, which differs from the doc in a few
// places — e.g. the inviter's coordinate origin ships as a value-bearing
// `meeting_request`).

const CONTENT_TYPE = 'application/sylk-location-sharing';

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

function isLocationSharing(contentType) {
    return contentType === CONTENT_TYPE;
}

// Parse the cleartext wire envelope. Returns the object or null on garbage.
function parseEnvelope(rawContent) {
    if (typeof rawContent !== 'string') {
        return (rawContent && typeof rawContent === 'object') ? rawContent : null;
    }
    try {
        const wire = JSON.parse(rawContent);
        return (wire && typeof wire === 'object') ? wire : null;
    } catch (e) {
        return null;
    }
}

// Split a decrypted `value` plaintext into { coords, destination }.
// Bare coords: { latitude, longitude, ... }. Wrapped (meet w/ destination):
// { value: { latitude, ... }, destination: { latitude, ... } }.
function splitDecryptedValue(plain) {
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
//   opts.decrypt(armored) -> Promise<plaintextString>   (wraps account.pgp)
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
async function toLocationEvent(wire, opts = {}) {
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
    if (typeof wire.value !== 'string' || !opts.decrypt) return null;

    let plain;
    try {
        plain = await opts.decrypt(wire.value);
    } catch (e) {
        return null;
    }
    if (plain == null) return null;

    const { coords, destination } = splitDecryptedValue(plain);
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

// Build an opts.decrypt using a sylkrtc account's pgp worker. Returns a
// function(armored) -> Promise<plaintext|null>. `account.pgp.decryptMessage`
// takes { content, message_id } and resolves { content: <plaintext>, didDecrypt }.
function decryptorFor(account, messageId) {
    return function (armored) {
        try {
            const pgp = account && account.pgp;
            if (!pgp || typeof pgp.decryptMessage !== 'function') return Promise.resolve(null);
            return pgp.decryptMessage({ content: armored, 'message_id': messageId })
                .then(res => (res && res.didDecrypt !== false) ? res.content : null)
                .catch(() => null);
        } catch (e) {
            return Promise.resolve(null);
        }
    };
}

exports.CONTENT_TYPE = CONTENT_TYPE;
exports.isLocationSharing = isLocationSharing;
exports.parseEnvelope = parseEnvelope;
exports.splitDecryptedValue = splitDecryptedValue;
exports.toLocationEvent = toLocationEvent;
exports.decryptorFor = decryptorFor;
