'use strict';

const localforage = require('localforage');
const debug       = require('debug');

const electronStorage = require('./electronStorage');
const { Queue }   = require('./utils');


const DEBUG = debug('blinkrtc:keyStorage');

let store = null;


function initialize(account, electronStore, electron = false) {
    DEBUG('Key store init');
    if (store === null) {
        if (!electron) {
            store = localforage.createInstance({
                driver: localforage.INDEXEDDB,
                name: 'Sylk',
                storeName: `keys_${account}`
            });
        } else {
            store = new electronStorage(electronStore, {debug: DEBUG});
            store.init(account, "keys");
        }
    }
}


function set(key, value) {
    return store.setItem(key, value);
}


function get(key) {
    return store.getItem(key);
}


function remove(key) {
    return store.removeItem(key);
}


function dropInstance() {
    if (store instanceof electronStorage) {
        return store.clear();
    }
    return store.dropInstance();
}


function close() {
    store = null;
    return;
}


function getAll() {
    if (store === null) return {};

    const keys = {};
    const promises = [];
    return Queue.enqueue(() => store.keys().then((contacts) => {
        if (contacts) {
            for (let contact of contacts) {
                promises.push(store.getItem(contact).then((key) => {
                    if (key) {
                        keys[contact] = key;
                    }
                }))
            }
        }
        return Promise.all(promises).then(() => {
            return keys;
        });
    }));
}


function add(key) {
    if (store === null) return [];

    Queue.enqueue(() => get(key.contact).then((publicKey) => {
        if (publicKey && publicKey === key.key) {
            DEBUG('Public key is the same for %s, not saving in storage: %o', key.contact, key.key);
            return publicKey
        }
        publicKey = key.key;

        DEBUG('Saving public key in storage: %o', key.key);
        set(key.contact, publicKey);
        return publicKey;
    }));
}


exports.initialize = initialize;
exports.set = set;
exports.get = get;
exports.add = add;
exports.remove = remove;
exports.getAll = getAll;
exports.close = close;
exports.dropInstance = dropInstance;
