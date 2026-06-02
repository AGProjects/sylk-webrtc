'use strict';

const localforage = require('localforage');
const debug       = require('debug');

const electronStorage = require('./electronStorage');


const DEBUG = debug('blinkrtc:addressbookStorage');

let store = null;


function initialize(account, electronStore, electron = false) {
    DEBUG('Addressbook store init');
    if (store === null) {
        if (!electron) {
            store = localforage.createInstance({
                driver: localforage.INDEXEDDB,
                name: 'Sylk',
                storeName: `addressbook_${account}`
            });
        } else {
            store = new electronStorage(electronStore, {debug: DEBUG});
            store.init(account, 'addressbook');
        }
    }
}


function set(key, value) {
    return store.setItem(key, value);
}


function get(key) {
    if (store == null) {
        return Promise.resolve([]);
    }
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


exports.initialize = initialize;
exports.set = set;
exports.get = get;
exports.remove = remove;
exports.close = close;
exports.dropInstance = dropInstance;
