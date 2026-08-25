'use strict';
const { v4: uuidv4 } = require('uuid');
const SillyNames = require('./SillyNames');
const MaterialColors = require('./MaterialColors');
const { Queue } = require('./utils/Queue');
const { EventEmitter } = require('events');
const { resumableDownload } = require('./utils/resumableFetch');

const { default: parse } = require('html-react-parser');
const linkifyUrls = require('linkify-urls');

function generateUniqueId() {
    const uniqueId = uuidv4().replace(/-/g, '').slice(0, 16);
    return uniqueId;
}

// Is this Electron desktopCapturer source a whole display rather than a single
// application window? Displays carry a display_id; windows report it as ''.
// Some platforms leave it empty for displays too, hence the id check.
function isDisplaySource(source) {
    if (!source) {
        return false;
    }
    return (source.display_id !== undefined && source.display_id !== null && source.display_id !== '')
        || String(source.id).lastIndexOf('screen', 0) === 0;
}

// Is this URI a dialled phone number rather than a SIP/Sylk account?
//
// Ported from sylk-mobile's utils.isPhoneNumber so both clients classify
// a destination the same way. Used by the capability advertisement to
// skip PSTN destinations: a gateway can never advertise anything back,
// and pushing an unknown content type into a SIP trunk is a needless
// interop risk.
//
// `conferenceDomain` is the account's configured conference domain.
// Conference URIs are NEVER phone numbers even when the room name is all
// digits or starts with a leading 0, and substrings like 'conference.'
// are not a reliable signal, so the domain is compared outright. Callers
// without it just omit it.
function isPhoneNumber(uri, conferenceDomain) {
    if (typeof uri !== 'string' || !uri) {
        return false;
    }
    // A tel: URI is a phone number wearing a scheme; unwrap it first.
    let target = uri.trim();
    if (target.toLowerCase().indexOf('tel:') === 0) {
        target = target.substring(4);
    }
    let username = target;
    let domain = '';
    if (target.indexOf('@') > -1) {
        const parts = target.split('@');
        username = parts[0].trim();
        domain = (parts[1] || '').trim().toLowerCase();
    }
    if (conferenceDomain && domain && domain === String(conferenceDomain).toLowerCase()) {
        return false;
    }
    // Allow the human-friendly separators people type or paste inside a
    // number -- spaces, dashes, underscores and parentheses -- so
    // '+1-313-1313', '+1313_1313' and '+1 313 1313' all still match.
    return /^(\+|0)([\d\-()_\s]+)$/.test(username);
}

function normalizeUri(uri, defaultDomain) {
    let targetUri = uri;
    let idx = targetUri.indexOf('@');
    let username;
    let domain;
    if (idx !== -1) {
        username = targetUri.substring(0, idx);
        domain = targetUri.substring(idx + 1);
    } else {
        username = targetUri;
        domain = defaultDomain;
    }
    username = username.replace(/[\s()-]/g, '');
    return `${username}@${domain}`;
}


// partially borrowed from clipboard.js
// Must call it from a click event handler
// returns true if the text was copied, false otherwise

function copyToClipboard(text) {
    const isRTL = document.documentElement.getAttribute('dir') == 'rtl';
    const fakeElem = document.createElement('textarea');
    let success = true;

    // Prevent zooming on iOS
    fakeElem.style.fontSize = '12pt';
    // Reset box model
    fakeElem.style.border = '0';
    fakeElem.style.padding = '0';
    fakeElem.style.margin = '0';
    // Move element out of screen horizontally
    fakeElem.style.position = 'absolute';
    fakeElem.style[isRTL ? 'right' : 'left'] = '-9999px';
    // Move element to the same position vertically
    fakeElem.style.top = (window.pageYOffset || document.documentElement.scrollTop) + 'px';
    fakeElem.setAttribute('readonly', '');
    fakeElem.value = text;
    // Add element to the body
    document.body.appendChild(fakeElem);
    // Select the element
    fakeElem.select();
    // Copy to clipboard
    try {
        document.execCommand('copy');
    } catch (e) {
        success = false;
    }
    // De-select the element
    fakeElem.blur();
    // Remove from body
    document.body.removeChild(fakeElem);

    return success;
}

function generateSillyName() {
    const adjective = SillyNames.randomAdjective();
    const number = Math.floor(Math.random() * 10);
    const noun1 = SillyNames.randomNoun();
    const noun2 = SillyNames.randomNoun();
    return adjective + noun1 + noun2 + number;
}

function generateRandomNumber() {
    const first = String(Math.floor(Math.random() * 9) + 1); // '1'–'9'
    const rest = String(Math.floor(Math.random() * 100000)).padStart(5, '0');
    const random6Str = first + rest;
    return random6Str
}

function generateMaterialColor(text) {
    return MaterialColors.generateColor(text);
}

function generateVideoTrack(stream, width = 640, height = 480) {
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const analyser = audioCtx.createAnalyser();
    const source = audioCtx.createMediaStreamSource(stream);
    source.connect(analyser);

    analyser.fftSize = 256;
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const canvas = Object.assign(document.createElement('canvas'), { width, height });
    const ctx = canvas.getContext('2d');

    const img = new Image();
    const blinkLogo = new Image();
    img.addEventListener('load', () => {
        draw();
    });

    const draw = () => {
        if (stream.active) {
            const drawVisual = requestAnimationFrame(draw);
        }
        analyser.getByteFrequencyData(dataArray);

        ctx.fillStyle = 'rgb(35, 35, 35)';
        ctx.fillRect(0, 0, width, height);
        ctx.filter = 'grayscale(100%) brightness(90%)';
        ctx.drawImage(blinkLogo, (width / 2) - 150, (height / 2) - 150, 300, 300);
        ctx.filter = 'none';
        ctx.drawImage(img, (width / 2) - 45, height / 3, 90, 90);
        const barWidth = (width / bufferLength) * 2.5;
        let barHeight;
        let x = 0;
        for (var i = 0; i < bufferLength; i++) {
            barHeight = dataArray[i] / 2;

            ctx.fillStyle = 'rgb(' + (barHeight + 100) + ', 50, 50)';
            ctx.fillRect(x, 2 * height / 3 - barHeight / 2, barWidth, barHeight);

            x += barWidth + 1;
        }
    };
    img.src = 'assets/images/video-camera-slash.png';
    blinkLogo.src = 'assets/images/blink-white-big.png';

    const canvasStream = canvas.captureStream();
    return Object.assign(canvasStream.getVideoTracks()[0], { enabled: true });
}

function getWindowHeight() {
    return window.innerHeight;
}

function loadAudio(file, context) {
    return new Promise((resolve, reject) => {
        let request = new XMLHttpRequest();
        request.open('GET', file, true);
        request.responseType = 'arraybuffer';
        request.onload = () => {
            if (request.status === 200) {
                context.decodeAudioData(request.response,
                    (buffer) => { resolve(buffer) },
                    (error) => { reject(error) }
                )
            } else {
                reject(Error(request.statusText));
            }
        }

        request.onerror = () => {
            reject(Error('Network Error'));
        }
        request.send();
    });
}

var isMobile = {
    Android: function() { return navigator.userAgent.match(/Android/i); },
    iOS: function() { return navigator.userAgent.match(/iPhone|iPad|iPod/i); },
    any: function() { return (isMobile.Android() || isMobile.iOS()) }
};

function isNodeEmitter(obj) {
    if (!obj || typeof obj !== 'object') return false;

    const hasEmitterMethods =
        typeof obj.on === 'function' &&
        typeof obj.emit === 'function' &&
        typeof obj.removeListener === 'function';

    return EventEmitter.prototype.isPrototypeOf(obj) || hasEmitterMethods;
};

function uniqueId(prefix = 'id') {
    return `${prefix}${generateUniqueId()}`;
};

function preHtmlEntities(str) {
    return String(str).replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
};

function postHtmlEntities(str) {
    return String(str).replace(/(?!&amp;|&lt;|&gt;|&quot;)&/g, '&amp;');
};

function customUrlRegexp() {
    return (/((?:https?(?::\/\/))(?:www\.)?(?:[a-zA-Z\d-_.]+(?:(?:\.|@)[a-zA-Z\d]{2,})|localhost)(?:(?:[-a-zA-Z\d:%_+.~#!?&//=@();]*)(?:[,](?![\s]))*)*)/g);
}

function linkify(content) {
    let linkfiedContent = linkifyUrls(preHtmlEntities(content), {
        customUrlRegexp,
        attributes: {
            target: '_blank',
            rel: 'noopener noreferrer'
        }
    });
    return parse(postHtmlEntities(linkfiedContent));
};

exports.copyToClipboard = copyToClipboard;
exports.normalizeUri = normalizeUri;
exports.isPhoneNumber = isPhoneNumber;
exports.generateSillyName = generateSillyName;
exports.generateRandomNumber = generateRandomNumber;
exports.generateUniqueId = generateUniqueId;
exports.isDisplaySource = isDisplaySource;
exports.uniqueId = uniqueId;
exports.generateMaterialColor = generateMaterialColor;
exports.generateVideoTrack = generateVideoTrack;
exports.getWindowHeight = getWindowHeight;
exports.loadAudio = loadAudio;
exports.Queue = Queue;
exports.isMobile = isMobile;
exports.isNodeEmitter = isNodeEmitter;
exports.linkify = linkify;
exports.customUrlRegexp = customUrlRegexp;
exports.resumableDownload = resumableDownload;
