'use strict';

// Shared live-location trail logic used by both the in-memory React state
// (Chat.js handleLocationMetadata) and the persisted store
// (messageStorage.js addLocationTick). Keeping a single implementation here
// avoids the two paths drifting apart (e.g. only one of them deduping ticks).

// Cap the retained points so an hours-long share can not grow without bound.
const LOCATION_TRAIL_MAX = 500;

// Build a trail point from a location metadata json payload, or null when the
// payload carries no usable coordinates.
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

// Apply a location metadata event to a { trail, expires, ended } state object,
// creating the state when absent. Handles both 'location' ticks and
// 'meeting_end'. Returns the (mutated) state.
function applyLocationEvent(state, json) {
    const next = state || { trail: [], expires: null, ended: false };
    next.trail = Array.isArray(next.trail) ? next.trail : [];

    if (json && json.action === 'meeting_end') {
        next.ended = true;
        return next;
    }

    next.trail = appendTick(next.trail, tickFromJson(json));
    const expires = json && json.expires ? new Date(json.expires) : null;
    if (expires) next.expires = expires;
    next.ended = false;
    return next;
}

exports.LOCATION_TRAIL_MAX = LOCATION_TRAIL_MAX;
exports.tickFromJson = tickFromJson;
exports.appendTick = appendTick;
exports.applyLocationEvent = applyLocationEvent;
