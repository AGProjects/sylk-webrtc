'use strict';


// Cap the retained points so an hours-long share can not grow without bound.
const LOCATION_TRAIL_MAX = 500;

function tickFromJson(json) {
    const v = (json && json.value) || {};
    if (typeof v.latitude !== 'number' || typeof v.longitude !== 'number') return null;
    return {
        latitude: v.latitude,
        longitude: v.longitude,
        accuracy: typeof v.accuracy === 'number' ? v.accuracy : null,
        timestamp: v.timestamp ? new Date(v.timestamp)
            : (json && json.timestamp ? new Date(json.timestamp) : new Date())
    };
}

// Append a tick to a trail, skipping duplicates (same timestamp + coords),
// keeping it sorted by time and capped at LOCATION_TRAIL_MAX. Returns the
// (mutated) trail array.
function appendTick(trail, tick) {
    const list = Array.isArray(trail) ? trail : [];
    if (!tick) return list;
    const tickTime = new Date(tick.timestamp).getTime();
    const dup = list.some(p => p
        && new Date(p.timestamp).getTime() === tickTime
        && Number(p.latitude) === Number(tick.latitude)
        && Number(p.longitude) === Number(tick.longitude));
    if (!dup) {
        list.push(tick);
        list.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
        if (list.length > LOCATION_TRAIL_MAX) {
            list.splice(0, list.length - LOCATION_TRAIL_MAX);
        }
    }
    return list;
}

function emptyState() {
    return {
        trail: [], peerTrail: [], startTrail: [], peerStartTrail: [],
        destination: null, expires: null,
        ended: false, endReason: null, oneShot: false, role: null
    };
}

function applyLocationEvent(state, json) {
    const next = state || emptyState();
    next.trail = Array.isArray(next.trail) ? next.trail : [];
    next.peerTrail = Array.isArray(next.peerTrail) ? next.peerTrail : [];
    next.startTrail = Array.isArray(next.startTrail) ? next.startTrail : [];
    next.peerStartTrail = Array.isArray(next.peerStartTrail) ? next.peerStartTrail : [];

    const kind = json && (json.kind || (json.action === 'meeting_end' ? 'end' : 'coords'));

    if (kind === 'stop' || kind === 'end') {
        next.ended = true;
        next.endReason = (json && json.reason) || 'ended';
        return next;
    }
    if (kind === 'reject') {
        next.ended = true;
        next.endReason = 'rejected';
        return next;
    }
    if (kind === 'request' || kind === 'accept') {
        return next;
    }

    const tick = tickFromJson(json);
    if (json && json.oneShot) {
        next.oneShot = true;
        if (tick) next.trail = [tick];
    } else if (json && json.meet) {
        if (tick) {
            if (json.direction === 'outgoing') {
                next.trail = [tick];
                if (next.startTrail.length === 0) next.startTrail = [tick];
            } else {
                next.peerTrail = [tick];
                if (next.peerStartTrail.length === 0) next.peerStartTrail = [tick];
            }
        }
        if (json.role) next.role = json.role;
        if (json.destination
            && typeof json.destination.latitude === 'number'
            && typeof json.destination.longitude === 'number') {
            next.destination = json.destination;
        }
    } else {
        next.trail = appendTick(next.trail, tick);
    }

    const expires = json && json.expires ? new Date(json.expires) : null;
    if (expires) next.expires = expires;
    next.ended = false;
    next.endReason = null;
    return next;
}

exports.LOCATION_TRAIL_MAX = LOCATION_TRAIL_MAX;
exports.tickFromJson = tickFromJson;
exports.appendTick = appendTick;
exports.emptyState = emptyState;
exports.applyLocationEvent = applyLocationEvent;
