'use strict';

// Guide marker for the remote-pointer feature.
//
// This is the SHARING side of the feature: the peer clicked our shared screen
// and we have to draw a short-lived "look here" marker somewhere that ends up
// inside the capture. How (and whether) that is possible depends entirely on
// what is being shared and on which runtime we are:
//
//   Electron  we ask the main process for a transparent, click-through,
//             always-on-top overlay window on the shared display, so the marker
//             lands in the capture wherever the peer pointed. Only works for a
//             shared DISPLAY: desktopCapturer reports no geometry for an
//             application window, so there is nowhere to put the marker.
//   browser   we can only paint inside our own page, so the marker only reaches
//             the capture when the whole screen is shared (with our window on
//             it). A shared tab or another app's window can never show it, and
//             neither can a hidden tab or a minimized window.
//
// Everything here is purely visual and never intercepts input.

const DOT_ID = 'sylk-pointer-guide';
const STYLE_ID = 'sylk-pointer-guide-style';
const DOT_VISIBLE_MS = 760;

// Electron exposes node's require on window; the browser build does not.
const isElectron = window.require !== undefined;

let dotElement = null;
let hideTimer = null;

// 'browser' (tab) | 'window' | 'monitor' | null when it cannot be determined.
function sharedSurfaceKind(call) {
    let settings = null;
    try {
        const stream = call.getLocalStreams()[0];
        const track = stream && stream.getVideoTracks()[0];
        settings = track && track.getSettings ? track.getSettings() : null;
    } catch (e) { /* noop */ }
    if (!settings) { return null; }
    if (settings.displaySurface) { return settings.displaySurface; }
    // Firefox does not report displaySurface: guess from the captured size.
    const dpr = window.devicePixelRatio || 1;
    const w = settings.width, h = settings.height;
    if (!w || !h) { return null; }
    const near = (a, b) => b > 0 && Math.abs(a - b) <= Math.max(32, b * 0.05);
    if (near(w, (window.screen.width || 0) * dpr) && near(h, (window.screen.height || 0) * dpr)) { return 'monitor'; }
    if (near(w, window.outerWidth * dpr) && near(h, window.outerHeight * dpr)) { return 'window'; }
    if (near(w, window.innerWidth * dpr) && near(h, window.innerHeight * dpr)) { return 'browser'; }
    return null;
}

// Can this share be pointed at at all? Fixed for the lifetime of the share, so
// it is announced once, in the screen-sharing 'start' message.
function supportedForShare(call) {
    if (isElectron) {
        return !call._sharedIsWindow;
    }
    const kind = sharedSurfaceKind(call);
    return kind === null ? true : kind === 'monitor';
}

// Can a marker be drawn right this moment? Only a browser can lose the ability
// mid-share (hidden tab / minimized window), which is what makes it worth
// re-announcing over the pointer-visibility channel.
function renderableNow(call) {
    if (!supportedForShare(call)) { return false; }
    return isElectron ? true : !document.hidden;
}

// Whether renderableNow() can change during a share and has to be watched.
function tracksVisibility() {
    return !isElectron;
}

// Normalized point on the captured surface -> CSS pixels in this viewport.
function mapSharedPointToViewport(call, x, y) {
    const innerW = window.innerWidth, innerH = window.innerHeight;
    const outerH = window.outerHeight || innerH;
    // Height of the browser chrome above the page (tabs, address bar).
    const chromeH = Math.max(0, outerH - innerH);
    const kind = sharedSurfaceKind(call) || 'monitor';
    let left, top;
    if (kind === 'browser') {
        // A tab was shared: the captured surface IS a page viewport.
        left = x * innerW;
        top = y * innerH;
    } else if (kind === 'window') {
        // A window was shared: assume it is this browser window, whose captured
        // surface includes the chrome above the viewport.
        left = x * (window.outerWidth || innerW);
        top = y * outerH - chromeH;
    } else {
        // A whole screen was shared: go via screen coordinates. With several
        // displays this is only right when the captured screen is the one
        // holding this window; the clamp below keeps the marker visible either way.
        left = x * (window.screen.width || innerW) - (window.screenX || 0);
        top = y * (window.screen.height || innerH) - (window.screenY || 0) - chromeH;
    }
    // A point outside our page (another app, a second display) can only be
    // hinted at, so pin the marker to the nearest edge instead of losing it.
    const m = 16;
    return {
        left: Math.min(Math.max(left, m), Math.max(m, innerW - m)),
        top: Math.min(Math.max(top, m), Math.max(m, innerH - m))
    };
}

function dot() {
    if (dotElement && dotElement.isConnected) { return dotElement; }
    if (!document.body) { return null; }
    if (!document.getElementById(STYLE_ID)) {
        const style = document.createElement('style');
        style.id = STYLE_ID;
        style.textContent = `#${DOT_ID}{position:fixed;width:46px;height:46px;`
            + 'margin:-23px 0 0 -23px;border-radius:50%;border:4px solid #2196F3;'
            + 'background:rgba(33,150,243,.22);box-shadow:0 0 0 4px rgba(33,150,243,.35);'
            + 'pointer-events:none;z-index:2147483647;opacity:0;transition:opacity .12s}'
            + `#${DOT_ID}.on{animation:sylk-pointer-pulse .38s ease-out 2}`
            + '@keyframes sylk-pointer-pulse{0%{transform:scale(.7);opacity:.95}'
            + '100%{transform:scale(1.9);opacity:0}}';
        document.head.appendChild(style);
    }
    dotElement = document.createElement('div');
    dotElement.id = DOT_ID;
    document.body.appendChild(dotElement);
    return dotElement;
}

function showInPage(call, x, y) {
    // Hidden tab / minimized window: nothing we draw can be seen or captured.
    if (document.hidden) { return false; }
    const element = dot();
    if (!element) { return false; }
    const pos = mapSharedPointToViewport(call, x, y);
    element.style.left = pos.left + 'px';
    element.style.top = pos.top + 'px';
    element.classList.remove('on');
    void element.offsetWidth;    // restart the pulse animation
    element.classList.add('on');
    element.style.opacity = 1;
    clearTimeout(hideTimer);
    hideTimer = setTimeout(() => {
        element.style.opacity = 0;
        element.classList.remove('on');
    }, DOT_VISIBLE_MS);
    return true;
}

// Draw the marker at a normalized (0..1) point on the shared surface.
// Returns whether it was actually rendered (which is what gets ACKed).
function show(call, x, y) {
    if (isElectron) {
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
    return showInPage(call, x, y);
}

function destroy() {
    clearTimeout(hideTimer);
    hideTimer = null;
    if (dotElement && dotElement.parentNode) {
        dotElement.parentNode.removeChild(dotElement);
    }
    dotElement = null;
    const style = document.getElementById(STYLE_ID);
    if (style && style.parentNode) {
        style.parentNode.removeChild(style);
    }
}

exports.supportedForShare = supportedForShare;
exports.renderableNow = renderableNow;
exports.tracksVisibility = tracksVisibility;
exports.show = show;
exports.destroy = destroy;
