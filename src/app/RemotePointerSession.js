'use strict';

const { EventEmitter } = require('events');
const debug = require('debug');

const guideMarker = require('./guideMarker');

const DEBUG = debug('blinkrtc:RemotePointer');

// Wire protocol. These all travel on the in-dialog (session) message channel —
// Call.sendMessage() / call.on('incomingMessage') — and never touch the
// account-level message channel, so they can't leak into the chat history.
//
//   sylk-screen-sharing       {action: 'start'|'stop', pointer: <bool>}
//       Announces our screen share. `pointer` says whether the share can be
//       pointed at at all; it is fixed for the lifetime of a share, so it is
//       normally sent once (see _announceCapability for the one exception).
//   sylk-pointer              {x, y, t}
//       A guide point, normalized (0..1) on the shared surface. `t` identifies
//       the click so the sender can echo it once we confirm rendering it.
//   sylk-pointer-visibility   {inApp: <bool>}
//       The sharer can't paint into the capture right now (backgrounded iOS
//       app, hidden browser tab). Unlike `pointer` this changes during a share.
//   sylk-pointer-ack          {t}
//       We rendered the point identified by `t`.
const CONTENT_TYPE = {
    sharing: 'application/sylk-screen-sharing',
    pointer: 'application/sylk-pointer',
    visibility: 'application/sylk-pointer-visibility',
    ack: 'application/sylk-pointer-ack'
};

// Forget clicks we never saw an ACK for after this long.
const PENDING_POINT_TTL = 5000;

// Normalized coordinates are sent with millipoint precision; more is noise.
const COORD_PRECISION = 1000;

/**
 * Owns the remote-pointer protocol for a single call, on both sides:
 *
 *   as VIEWER  it tracks whether the peer is sharing a screen, whether that
 *              share can be pointed at, and whether the peer can render a
 *              marker right now; it sends the points we click.
 *   as SHARER  it announces our share, draws the peer's guide points via
 *              guideMarker, and ACKs the ones that were actually rendered.
 *
 * Deliberately free of React: the UI subscribes to 'changed' and 'ack' and
 * renders from the getters.
 *
 * Events:
 *   'changed'          remoteSharing / remoteCapable / remoteInApp changed
 *   'ack' ({clientX, clientY})
 *                      the peer rendered a point we sent from that position
 */
class RemotePointerSession extends EventEmitter {
    constructor(call) {
        super();
        this._call = call;
        // The peer's state survives navigating away from the call screen and
        // back, so it is remembered on the (longer-lived) call object.
        this._remoteSharing = !!call._remotePeerSharing;
        this._remoteCapable = call._remotePointerCapable !== false;
        this._remoteInApp = true;
        this._pendingPoints = new Map();
        this._remoteVideoSize = null;
        this._announcedCapable = null;

        this._onMessage = this._onMessage.bind(this);
        this._onVisibilityChange = this._onVisibilityChange.bind(this);

        this._call.on('incomingMessage', this._onMessage);
    }

    /** The peer is sharing their screen with us. */
    get remoteSharing() { return this._remoteSharing; }

    /** The peer's share can be pointed at at all (not a window / tab share). */
    get remoteCapable() { return this._remoteCapable; }

    /** The peer can render a marker right now (their app/tab is in front). */
    get remoteInApp() { return this._remoteInApp; }

    /** Would clicking the remote video actually put a marker on their screen? */
    get canPoint() {
        return this._remoteSharing && this._remoteCapable && this._remoteInApp;
    }

    close() {
        this._call.removeListener('incomingMessage', this._onMessage);
        document.removeEventListener('visibilitychange', this._onVisibilityChange);
        this._pendingPoints.clear();
        guideMarker.destroy();
        this.removeAllListeners();
    }

    // -- outgoing ------------------------------------------------------------

    /**
     * Announce that we started/stopped sharing our screen. Its arrival is also
     * what tells the peer we speak this protocol at all, so their pointer
     * button only appears for peers that can do something with it.
     */
    setLocalSharing(sharing) {
        if (!sharing) {
            document.removeEventListener('visibilitychange', this._onVisibilityChange);
            this._announcedCapable = null;
            this._send(CONTENT_TYPE.sharing, { action: 'stop' });
            return;
        }
        this._announceCapability();
        // Only a browser can lose the ability to paint into the capture partway
        // through a share (hidden tab, minimized window), so it is the only one
        // that has to keep watching.
        if (guideMarker.tracksVisibility()) {
            document.addEventListener('visibilitychange', this._onVisibilityChange);
        }
        this._sendVisibility();
    }

    /**
     * Announce whether our share can be pointed at. Normally sent once, with
     * the 'start': the answer is fixed for the lifetime of a share. The one
     * exception is a browser that could not classify the captured surface yet
     * (Firefox reports no displaySurface and we have to guess from its size),
     * where the first answer can turn out wrong — so re-announce if it changes.
     */
    _announceCapability() {
        const capable = guideMarker.supportedForShare(this._call);
        if (capable === this._announcedCapable) { return; }
        this._announcedCapable = capable;
        this._send(CONTENT_TYPE.sharing, { action: 'start', pointer: capable });
    }

    /**
     * Remember the remote video's intrinsic size, as a fallback for mapping
     * clicks when the element reports no dimensions.
     */
    noteRemoteVideoSize(width, height) {
        if (width && height) {
            this._remoteVideoSize = { width, height };
        }
    }

    /**
     * Map a click on the remote video onto the peer's shared surface and send
     * it. Returns whether anything was sent.
     */
    sendPoint(video, event) {
        if (!this.canPoint || !video) { return false; }
        const point = this._normalize(video, event);
        if (!point) { return false; }

        const t = Date.now();
        // Remember where we clicked so the ACK can be echoed there, and drop
        // whatever never came back.
        this._pendingPoints.set(t, { clientX: event.clientX, clientY: event.clientY });
        for (const key of this._pendingPoints.keys()) {
            if (key < t - PENDING_POINT_TTL) { this._pendingPoints.delete(key); }
        }
        return this._send(CONTENT_TYPE.pointer, { x: point.x, y: point.y, t });
    }

    /** Normalized (0..1) position of a click within the video's picture. */
    _normalize(video, event) {
        const rect = video.getBoundingClientRect();
        // Live videoWidth/videoHeight first: the cached size can still be the
        // one from the peer's CAMERA when they switch to a screen share, and
        // mapping a 16:9 click onto a 16:10 screen shifts every point.
        const natural = (video.videoWidth && video.videoHeight)
            ? { width: video.videoWidth, height: video.videoHeight }
            : this._remoteVideoSize;
        let x, y;
        if (natural) {
            // object-fit: contain ('fit' while the peer shares a screen) —
            // account for the letterbox so the click maps exactly onto the
            // shared screen rather than onto the black bars.
            const scale = Math.min(rect.width / natural.width, rect.height / natural.height);
            const shownWidth = natural.width * scale;
            const shownHeight = natural.height * scale;
            const offsetX = (rect.width - shownWidth) / 2;
            const offsetY = (rect.height - shownHeight) / 2;
            x = (event.clientX - rect.left - offsetX) / shownWidth;
            y = (event.clientY - rect.top - offsetY) / shownHeight;
        } else {
            x = (event.clientX - rect.left) / rect.width;
            y = (event.clientY - rect.top) / rect.height;
        }
        if (!(x >= 0 && x <= 1 && y >= 0 && y <= 1)) { return null; }
        return {
            x: Math.round(x * COORD_PRECISION) / COORD_PRECISION,
            y: Math.round(y * COORD_PRECISION) / COORD_PRECISION
        };
    }

    _onVisibilityChange() {
        this._announceCapability();
        this._sendVisibility();
    }

    _sendVisibility() {
        this._send(CONTENT_TYPE.visibility, { inApp: guideMarker.renderableNow(this._call) });
    }

    _send(contentType, payload) {
        try {
            this._call.sendMessage(JSON.stringify(payload), contentType);
            return true;
        } catch (e) {
            DEBUG('Could not send %s: %s', contentType, e);
            return false;
        }
    }

    // -- incoming ------------------------------------------------------------

    _onMessage(message) {
        if (!message || !message.contentType) { return; }
        let content;
        switch (message.contentType) {
            case CONTENT_TYPE.sharing:
                content = this._parse(message);
                if (content) { this._handleSharing(content); }
                break;
            case CONTENT_TYPE.pointer:
                content = this._parse(message);
                if (content) { this._handlePointer(content); }
                break;
            case CONTENT_TYPE.visibility:
                content = this._parse(message);
                if (content && typeof content.inApp === 'boolean') {
                    this._update({ remoteInApp: content.inApp });
                }
                break;
            case CONTENT_TYPE.ack:
                content = this._parse(message);
                if (content) { this._handleAck(content); }
                break;
            default:
                break;
        }
    }

    _parse(message) {
        try {
            return JSON.parse(message.content);
        } catch (e) {
            DEBUG('Ignoring malformed %s: %s', message.contentType, e);
            return null;
        }
    }

    _handleSharing(content) {
        if (content.action !== 'start' && content.action !== 'stop') { return; }
        const sharing = content.action === 'start';
        this._update({
            remoteSharing: sharing,
            // Older peers omit `pointer`: assume the share is pointable.
            remoteCapable: sharing ? content.pointer !== false : true,
            // A new share starts out renderable until the sharer says otherwise;
            // this also clears any stale value left by a previous share.
            remoteInApp: true
        });
    }

    _handlePointer(content) {
        // Only draw a guide marker if WE are the one sharing our screen.
        if (!this._call.sharingScreen) { return; }
        if (typeof content.x !== 'number' || typeof content.y !== 'number') { return; }
        const rendered = guideMarker.show(this._call, content.x, content.y);
        // ACK so the sender knows we rendered it and can echo it locally.
        if (rendered && content.t != null) {
            this._send(CONTENT_TYPE.ack, { t: content.t });
        }
    }

    _handleAck(content) {
        if (content.t == null) { return; }
        const origin = this._pendingPoints.get(content.t);
        if (!origin) { return; }
        this._pendingPoints.delete(content.t);
        this.emit('ack', origin);
    }

    _update(next) {
        let changed = false;
        if ('remoteSharing' in next && next.remoteSharing !== this._remoteSharing) {
            this._remoteSharing = next.remoteSharing;
            this._call._remotePeerSharing = next.remoteSharing;
            changed = true;
        }
        if ('remoteCapable' in next && next.remoteCapable !== this._remoteCapable) {
            this._remoteCapable = next.remoteCapable;
            this._call._remotePointerCapable = next.remoteCapable;
            changed = true;
        }
        if ('remoteInApp' in next && next.remoteInApp !== this._remoteInApp) {
            this._remoteInApp = next.remoteInApp;
            changed = true;
        }
        if (changed) {
            DEBUG('State: sharing=%s capable=%s inApp=%s',
                this._remoteSharing, this._remoteCapable, this._remoteInApp);
            this.emit('changed');
        }
    }
}


module.exports = RemotePointerSession;
