'use strict';

const localforage     = require('localforage');
const debug           = require('debug');
const electronStorage = require('./electronStorage');
const { Queue }       = require('./utils');

const DEBUG = debug('blinkrtc:zrtpStorage');

let store = null;

function initialize(account, electronStore, electron = false) {
    DEBUG('ZRTP store init');
    if (store === null) {
        if (!electron) {
            store = localforage.createInstance({
                driver:    localforage.INDEXEDDB,
                name:      'Sylk',
                storeName: `zrtp_${account}`
            });
        } else {
            store = new electronStorage(electronStore, { debug: DEBUG });
            store.init(account, 'zrtp');
        }
    }
}

function add(uri, value) {
    if (store === null) return;
    Queue.enqueue(() => store.setItem(uri, value));
}

function get(uri) {
    if (store === null) return Promise.resolve(null);
    return store.getItem(uri);
}

function remove(uri) {
    if (store === null) return;
    Queue.enqueue(() => store.removeItem(uri));
}

function getAll() {
    if (store === null) return Promise.resolve({});
    const result = {};
    return Queue.enqueue(() => store.keys().then(uris => {
        return Promise.all((uris ?? []).map(uri =>
            store.getItem(uri).then(value => {
                if (value) result[uri] = value;
            })
        )).then(() => result);
    }));
}

function close() {
    store = null;
}

function dropInstance() {
    if (store instanceof electronStorage) {
        return store.clear();
    }
    return store.dropInstance();
}

exports.initialize = initialize;
exports.add        = add;
exports.get        = get;
exports.remove     = remove;
exports.getAll     = getAll;
exports.close      = close;
exports.dropInstance = dropInstance;
