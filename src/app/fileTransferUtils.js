'use strict';

const superagent = require('superagent');
const debug = require('debug');

const config = require('./config');
const utils = require('./utils');

const DEBUG = debug('blinkrtc:fileTransferUtils');


const uploads = [];
const imageCache = {};

function upload({ notificationCenter, account }, files, uri) {
    for (const file of files) {
        if (file instanceof File) {
            let uploadRequest;
            let complete = false;
            const filename = file.name;
            let progressNotification = notificationCenter().postFileUploadProgress(
                filename,
                (notification) => {
                    if (!complete) {
                        uploadRequest.abort();
                        uploads.splice(uploads.indexOf(uploadRequest), 1);
                    }
                }
            );
            account.encryptFile(uri, file).then((encryptionResult) => {
                uploadRequest = superagent
                    .post(`${config.fileTransferUrl}/${account.id}/${uri}/${utils.generateUniqueId()}/${encryptionResult.file.name}`)
                    .set('Content-Type', encryptionResult.file.type)
                    //.set('Original-Content-Length', file.size)
                    .send(encryptionResult.file)
                    .on('progress', (e) => {
                        notificationCenter().editFileUploadNotification(e.percent, progressNotification);
                    })
                    .then(response => {
                        complete = true;
                        notificationCenter().removeFileUploadNotification(progressNotification);
                        uploads.splice(uploads.indexOf(uploadRequest), 1);
                    })
                    .catch(err => {
                        complete = true;
                        notificationCenter().removeFileUploadNotification(progressNotification);
                        notificationCenter().postFileUploadFailed(filename);
                        uploads.splice(uploads.indexOf(uploadRequest), 1);
                    });
                uploads.push([uploadRequest, progressNotification]);
            });
        }
    }
}

function _download(account, url, filename, filetype) {
    return superagent
        .get(`${url}`)
        .then((res) => {
            return account.decryptFile(res.text, filename, filetype);
        });
}

function _parameterTest(name, bool) {
    if (typeof bool === 'undefined') {
        throw new Error(`Parameter ${name} invalid`);
    }
}

function download(account, { url, filename, filetype }) {
    try {
        _parameterTest('url', url);
        _parameterTest('filename', filename);
    }
    catch (e) {
        DEBUG('%s', e)
        return;
    }

    if (filetype == null) {
        filetype = 'application/octet-stream'
    }

    if (!filename.endsWith('.asc')) {
        const a = document.createElement('a');
        a.href = url
        a.target = '_blank';
        a.download = filename;
        a.rel = 'noopener noreferrer'
        const clickEvent = document.createEvent('MouseEvent');
        clickEvent.initMouseEvent('click', true, true, window, 0,
            clickEvent.screenX, clickEvent.screenY, clickEvent.clientX, clickEvent.clientY,
            clickEvent.ctrlKey, clickEvent.altKey, clickEvent.shiftKey, clickEvent.metaKey,
            0, null);

        a.dispatchEvent(clickEvent);
        return;
    }

    _download(account, url, filename, filetype)
        .then(file => {
            const a = document.createElement('a');
            a.href = URL.createObjectURL(file.file)
            a.target = '_blank';
            a.download = file.file.name;
            a.rel = 'noopener noreferrer'
            const clickEvent = document.createEvent('MouseEvent');
            clickEvent.initMouseEvent('click', true, true, window, 0,
                clickEvent.screenX, clickEvent.screenY, clickEvent.clientX, clickEvent.clientY,
                clickEvent.ctrlKey, clickEvent.altKey, clickEvent.shiftKey, clickEvent.metaKey,
                0, null);
            a.dispatchEvent(clickEvent);
            URL.revokeObjectURL(a.href);
        })
}

function openInNewTab(account, { url, filename, filetype }) {
    try {
        _parameterTest('url', url);
        _parameterTest('filename', filename);
    }
    catch (e) {
        DEBUG('%s', e)
        return
    }

    if (!filename.endsWith('.asc')) {
        window.open(url, '_blank');
        return;
    }
    let newTab = window.open('', '_blank');

    _download(account, url, filename, filetype)
        .then(file => {
            let blob = URL.createObjectURL(file.file);
            newTab.location = blob;
            newTab.onload = (evt) => URL.revokeObjectURL(blob);
        });
}

function generateThumbnail(account, id, { url, filename, filetype }) {
    if (filetype == null) {
        filetype = 'application/octet-stream'
    }

    if (!filename.endsWith('.asc')) {
        return new Promise((resolve) => resolve([url, filename]))
    }

    if (imageCache[id] !== undefined) {
        return new Promise((resolve) => resolve(imageCache[id]))
    }

    return _download(account, url, filename, filetype)
        .then(file => {
            let fr = new FileReader();
            return new Promise((resolve, reject) => {
                fr.onload = () => {
                    if (filetype === 'image/svg+xml') {
                        resolve(['data:image/svg+xml;charset=utf-8,' + encodeURIComponent(fr.result), file.file.name])
                    }
                    let result = fr.result.replace('application/octet-stream', filetype);
                    resolve([result, file.file.name])
                }
                fr.onerror = reject;
                if (filetype === 'image/svg+xml') {
                    fr.readAsText(file.file)
                } else {
                    fr.readAsDataURL(file.file)
                }
            });
        }).then(([imageData, filename]) => {
            return new Promise((resolve, reject) => {
                let boundBox = [300, 300]

                const img = document.createElement('img');
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    const ctx = canvas.getContext('2d');
                    const scaleRatio = Math.min(boundBox[0] / img.width, boundBox[1] / img.height, 1);
                    const dpi = window.devicePixelRatio;
                    const w = Math.floor(img.width * scaleRatio * dpi);
                    const h = Math.floor(img.height * scaleRatio * dpi);
                    canvas.width = w;
                    canvas.height = h;
                    ctx.drawImage(img, 0, 0, w, h)
                    resolve([canvas.toDataURL(), filename, w / dpi, h / dpi]);
                    img.onerror = reject;
                }
                img.src = imageData;
            });
        }).then(([imageData, filename, w, h]) => {
            imageCache[id] = [imageData, filename, w, h];
            return [imageData, filename, w, h];
        }).catch(error => {
            DEBUG('Thumbnail generation failed: %s', error);
            return Promise.reject(error);
        });
};

function getImage(account, message) {
    let { filename, filetype, url } = JSON.parse(message.content)

    if (filetype == null) {
        filetype = 'application/octet-stream'
    }

    if (!filename.endsWith('.asc')) {
        return new Promise((resolve) => resolve([url, filename]))
    }

    return _download(account, url, filename, filetype)
        .then(file => {
            let fr = new FileReader();
            return new Promise((resolve, reject) => {
                fr.onload = () => {
                    if (filetype === 'image/svg+xml') {
                        resolve(['data:image/svg+xml,' + encodeURIComponent(fr.result), file.file.name])
                    }
                    let result = fr.result.replace('application/octet-stream', filetype);
                    resolve([result, file.file.name])
                }
                fr.onerror = reject;
                if (filetype === 'image/svg+xml') {
                    fr.readAsText(file.file)
                } else {
                    fr.readAsDataURL(file.file)
                }
            });
        }).then(([imageData, filename]) => {
            return [imageData, filename];
        });
};

module.exports = { upload, download, openInNewTab, generateThumbnail, getImage }
