const { usePrevious } = require('./');

const _lastPoint = (arr) => {
    if (!Array.isArray(arr) || arr.length === 0) return '';
    const p = arr[arr.length - 1] || {};
    const t = p.timestamp instanceof Date ? p.timestamp.getTime() : p.timestamp;
    return `${p.latitude},${p.longitude},${t}`;
};

const _sig = (m) => {
    let s = `${m.id}:${JSON.stringify(m.metadata ?? '')}`;
    if (m.contentType === 'application/sylk-location-sharing') {
        const trail = m.locationTrail;
        const peer = m.locationPeerTrail;
        s += `|loc:${Array.isArray(trail) ? trail.length : 0}:${_lastPoint(trail)}`
            + `:${Array.isArray(peer) ? peer.length : 0}:${_lastPoint(peer)}`
            + `:${m.locationEnded ? 1 : 0}:${m.locationEndReason ?? ''}`
            + `:${m.locationDestination
                ? `${m.locationDestination.latitude},${m.locationDestination.longitude}`
                : ''}`;
    }
    return s;
};

const useHasChanged = (value) => {
    const previousValue = usePrevious(value);
    const current = value.map(_sig).join(',');
    const previous = previousValue?.map(_sig).join(',') ?? '';
    return current !== previous;
};

export { useHasChanged };
