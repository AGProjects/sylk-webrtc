'use strict';

const { EventEmitter } = require('events');
const debug = require('debug');

const guideMarker = require('./guideMarker');

const DEBUG = debug('blinkrtc:RemotePointer');

/**
 * The pixel half of the remote-pointer feature, for a single call.
 *
 * The protocol itself lives in sylkrtc's Call: it owns the four content
 * types, the peer's sharing state (`remoteScreenSharing`,
 * `remoteScreenSharePointable`, `remoteInApp`, `canPointAtRemoteScreen`)
 * and the point/ack bookkeeping. What is left here is what a library
 * running in any environment cannot do:
 *
 *   as VIEWER  map a click on a <video> element onto a normalized point
 *              on the peer's shared surface -- geometry that needs the
 *              DOM, the element's box and the letterboxing of
 *              object-fit: contain.
 *   as SHARER  actually draw the peer's guide point somewhere that ends
 *              up inside our own capture, which under Electron means a
 *              transparent always-on-top overlay window (guideMarker),
 *              and confirm to the library what was really rendered.
 *
 * State is read from the call, not mirrored here. The one event this
 * still emits is 'ack', because the echo it drives is drawn in DOM
 * coordinates that only the caller understands -- they travel to the
 * library as an opaque context and come back untouched.
 */
class RemotePointerSession extends EventEmitter {
    constructor(call) {
        super();
        this._call = call;
        this._remoteVideoSize = null;

        this._onPointer = this._onPointer.bind(this);
        this._onPointerAck = this._onPointerAck.bind(this);

        this._call.on('pointer', this._onPointer);
        this._call.on('pointerAck', this._onPointerAck);
    }

    close() {
        this._call.removeListener('pointer', this._onPointer);
        this._call.removeListener('pointerAck', this._onPointerAck);
        this.removeAllListeners();
    }

    /**
     * Remember the remote video's intrinsic size, as a fallback for
     * mapping clicks when the element reports no dimensions.
     */
    noteRemoteVideoSize(width, height) {
        if (width && height) {
            this._remoteVideoSize = { width, height };
        }
    }

    /**
     * Map a click on the remote video onto the peer's shared surface and
     * send it. Returns whether anything was sent.
     */
    sendPoint(video, event) {
        if (!video) {
            return false;
        }
        const point = this._normalize(video, event);
        if (!point) {
            return false;
        }
        // The click's own DOM position rides along as context and comes
        // back with the ACK, so the echo lands exactly where the user
        // clicked rather than where we recompute it to be later.
        const sent = this._call.sendPointer(point.x, point.y,
            { clientX: event.clientX, clientY: event.clientY });
        return sent !== null;
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
        if (!(x >= 0 && x <= 1 && y >= 0 && y <= 1)) {
            return null;
        }
        return { x, y };
    }

    // The peer pointed at the screen we are sharing. The library has
    // already checked that we are in fact sharing.
    _onPointer(point) {
        const rendered = guideMarker.show(this._call, point.x, point.y);
        DEBUG('Guide point %s: %o', rendered ? 'drawn' : 'not drawable', point);
        // ACK only what was really drawn -- the sender echoes on the
        // strength of it.
        if (rendered) {
            this._call.ackPointer(point.t);
        }
    }

    // A point we sent was rendered on the peer's screen; hand back the DOM
    // position it was clicked at.
    _onPointerAck(context) {
        if (context) {
            this.emit('ack', context);
        }
    }
}


module.exports = RemotePointerSession;
