'use strict';

const superagent = require('superagent');
const debug = require('debug');

const config = require('./config');
const utils = require('./utils');
const cacheStorage = require('./cacheStorage');

const DEBUG = debug('blinkrtc:fileTransferUtils');


const uploads = [];
const imageCache = {};
const failedDownloads = new Set();

function _isMemoryCached(id) {
    return imageCache[id] !== undefined
}

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
    if (!filename.endsWith('.asc')) {
        return superagent
            .get(`${url}`)
            .timeout({
                response: 5000,
                deadline: 60000
            })
            .responseType('blob')
            .then((res) => {
                return Promise.resolve({ file: new File([res.body], filename, { 'type': filetype }), didDecrypt: false });
            });
    }
    return superagent
        .get(`${url}`)
        .timeout({
            response: 5000,
            deadline: 60000
        })
        .then((res) => {
            return account.decryptFile(res.text, filename, filetype);
        });
}

function _downloadAndRead(account, url, filename, filetype, id, contact) {
    return _download(account, url, filename, filetype)
        .then(file => {
            let fr = new FileReader();
            return new Promise((resolve, reject) => {
                fr.onload = () => {
                    if (filetype === 'image/svg+xml') {
                        resolve(['data:image/svg+xml,' + encodeURIComponent(fr.result), file.file.name])
                    }
                    let result = fr.result.replace('application/octet-stream', filetype);
                    cacheStorage.add({ id: id, data: [result, file.file.name], contact: contact })
                    resolve([result, file.file.name])
                }
                fr.onerror = reject;
                if (filetype === 'image/svg+xml') {
                    fr.readAsText(file.file)
                } else {
                    fr.readAsDataURL(file.file)
                }
            });
        }).catch((error) => {
            return Promise.reject({ error, filename });
        })
}

function _parameterTest(name, bool) {
    if (typeof bool === 'undefined') {
        throw new Error(`Parameter ${name} invalid`);
    }
}

function download(account, { url, filename, filetype, transfer_id: id }) {
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

    return cacheStorage.get(id).then(data => {
        if (data) {
            DEBUG('Downloading file from file cache: %s (%s)', filename, id)
            fetch(data.data[0])
                .then(response => response.blob())
                .then(blob => {
                    let file = new File([blob], data.data[1], { 'type': filetype })
                    let newBlob = URL.createObjectURL(file);
                    const a = document.createElement('a');
                    a.href = newBlob
                    a.target = '_blank';
                    a.download = file.name;
                    a.rel = 'noopener noreferrer'
                    const clickEvent = document.createEvent('MouseEvent');
                    clickEvent.initMouseEvent('click', true, true, window, 0,
                        clickEvent.screenX, clickEvent.screenY, clickEvent.clientX, clickEvent.clientY,
                        clickEvent.ctrlKey, clickEvent.altKey, clickEvent.shiftKey, clickEvent.metaKey,
                        0, null);
                    a.dispatchEvent(clickEvent);
                    URL.revokeObjectURL(newBlob);
                    URL.revokeObjectURL(a.href);
                })
                .catch(error => DEBUG(error))
            return
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

        return _download(account, url, filename, filetype).then(file => {
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
            return Promise.resolve();
        }).catch((error) => {
            return Promise.reject({ error, filename });
        })
    })
}

function openInNewTab(account, { url, filename, filetype, transfer_id: id }) {
    try {
        _parameterTest('url', url);
        _parameterTest('filename', filename);
    }
    catch (e) {
        DEBUG('%s', e)
        return
    }

    let newTab = window.open('', '_blank')
    cacheStorage.get(id).then(data => {
        if (data) {
            fetch(data.data[0])
                .then(response => response.blob())
                .then(blob => {
                    let file = new File([blob], filename, { 'type': filetype })
                    let newBlob = URL.createObjectURL(file);
                    newTab.location = newBlob;
                    newTab.onload = (evt) => URL.revokeObjectURL(newBlob);
                })
                .catch(error => DEBUG(error))
            return
        }

        _download(account, url, filename, filetype).then(file => {
            let blob = URL.createObjectURL(file.file);
            newTab.location = blob;
            newTab.onload = (evt) => URL.revokeObjectURL(blob);
        });
    });
}

function generateThumbnail(account, message) {
    let { id, state } = message
    let { url, filename, filetype, sender, receiver } = message.json;

    if (filetype == null) {
        filetype = 'application/octet-stream'
    }


    if (_isMemoryCached(id)) {
        DEBUG('Thumbnail from memory cache: %s (%s)', filename, id);
        return new Promise((resolve) => resolve(imageCache[id]))
    }

    if (failedDownloads.has(id)) {
        const error = `Thumbnail generation failed for ${filename}: download failed previously`;
        DEBUG(error);
        return Promise.reject(error);
    }

    let contact = receiver.uri;
    if (state === 'received') {
        contact = sender.uri;
    }

    return cacheStorage.get(`thumb_${id}`).then(data => {
        if (data) {
            DEBUG('Thumbnail from file cache: %s (%s)', filename, id);
            imageCache[id] = data.data;
            return new Promise((resolve) => resolve(data.data))
        }
        return _downloadAndRead(account, url, filename, filetype, id, contact)
            .then(([imageData, filename]) => {
                DEBUG('Generating thumbnail from download: %s (%s)', filename, id);
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
                    }
                    img.onerror = reject;
                    img.src = imageData;
                });
            }).then(([imageData, filename, w, h]) => {
                cacheStorage.addThumbnail({ id: id, data: [imageData, filename, w, h], contact: contact })
                imageCache[id] = [imageData, filename, w, h];
                return [imageData, filename, w, h];
            }).catch(error => {
                DEBUG('Thumbnail generation failed for %s: %s', filename, error.error);
                failedDownloads.add(id);
                return Promise.reject(error);
            });
    });
};

function getAndReadFile(account, message) {
    let { filename, filetype, url } = message.json

    if (filetype == null) {
        filetype = 'application/octet-stream'
    }

    if (filename.startsWith('sylk-audio-recording.wav')) {
        filetype = 'audio/wav'
    }

    let contact = message.receiver;
    if (message.state === 'received') {
        contact = message.sender.uri;
    }

    return cacheStorage.get(message.id).then(data => {
        if (data) {
            if (filename.startsWith('sylk-audio-recording.wav')) {
                data.data[0] = data.data[0].replace('application/octet-stream', filetype);
                data.data[0] = data.data[0].replace('application/wav', filetype);
            }
            return new Promise((resolve) => resolve(data.data))
        }
        return _downloadAndRead(account, url, filename, filetype, message.id, contact)
    });
};


module.exports = { upload, download, openInNewTab, generateThumbnail, getAndReadFile }
