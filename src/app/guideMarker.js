'use strict';

// Guide marker for the remote-pointer feature.
//
// This is the SHARING side: the peer clicked our shared screen and we draw a
// short-lived "look here" marker somewhere that ends up inside the capture.
// Only the Electron build can do that — it asks the main process for a
// transparent, click-through, always-on-top overlay window on the shared
// display (see app/index.js), so the marker lands in the capture wherever the
// peer pointed, whatever is on screen at the time.
//
// The web build cannot: a page can only paint inside itself, so a marker would
// reach the capture only in the one case where a whole screen happens to be
// shared with our window on it, and never for a shared tab or another app's
// window. Rather than guess — the classification is unreliable, Firefox does
// not even report the surface type — the browser simply declares itself
// unpointable, and peers hide their pointer button for our shares.
//
// Purely visual; the overlay never intercepts input.

// Electron exposes node's require on window; the browser build does not.
const isElectron = window.require !== undefined;

// Can this share be pointed at at all? Fixed for the lifetime of the share, so
// it is announced once, in the screen-sharing 'start' message.
function supportedForShare(call) {
    // An application-window share gives no geometry to place the marker
    // against: desktopCapturer reports no window bounds.
    return isElectron && !call._sharedIsWindow;
}

// Draw the marker at a normalized (0..1) point on the shared surface.
// Returns whether it was actually rendered, which is what gets ACKed.
function show(call, x, y) {
    if (!supportedForShare(call)) { return false; }
    try {
        const { ipcRenderer } = window.require('electron');
        ipcRenderer.send('pointer-overlay', {
            x: x,
            y: y,
            displayId: call._sharedDisplayId || null
        });
        return true;
    } catch (e) {
        return false;
    }
}

exports.supportedForShare = supportedForShare;
exports.show = show;
