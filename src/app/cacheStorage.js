'use strict';

const localforage = require('localforage');
const debug = require('debug');

const electronStorage = require('./electronStorage');
const { Queue } = require('./utils');


const DEBUG = debug('blinkrtc:cacheStorage');

let store = null;

const idsInCache = new Set();


function initialize(account, electronStore, electron = false) {
    DEBUG('File cache store init');
    if (store === null) {
        if (!electron) {
            store = localforage.createInstance({
                driver: localforage.INDEXEDDB,
                name: 'Sylk',
                storeName: `cache_${account}`
            });
        } else {
            store = new electronStorage(electronStore, {debug: DEBUG});
            store.init(account, "cache");
        }
        prime();
    }
}


function set(key, value) {
    return store.setItem(key, value);
}


function get(key) {
    return store.getItem(key);
}


function removeAll(contact) {
    if (store === null) return {};

    DEBUG('Removing all cache items for %s', contact)
    return Queue.enqueue(() => store.keys().then((ids) => {
        if (ids) {
            for (let id of ids) {
                store.getItem(id)
                    .then((data) => {
                        if (data) {
                            if (data.contact === contact) {
                                store.removeItem(id).then(DEBUG('Cache item removed: %s - %s', id, data.data[1]))
                                idsInCache.delete(id);
                            }
                        }
                    })
            }
        }
    }));
}

function remove(key) {
    idsInCache.delete(key);
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

function prime() {
    if (store === null) return {};

    DEBUG('Priming cache');
    return Queue.enqueue(() => store.keys().then((ids) => {
        if (ids) {
            for (let id of ids) {
                idsInCache.add(id);
            }
            DEBUG(`Primed cache with ${idsInCache.size} items`);
        }
    }));
}

function isCached(id) {
    return idsInCache.has(id);
}

function getAll() {
    if (store === null) return {};

    const keys = {};
    const promises = [];
    return Queue.enqueue(() => store.keys().then((ids) => {
        if (ids) {
            for (let id of id) {
                promises.push(store.getItem(id).then((data) => {
                    if (data) {
                        keys[id] = data;
                    }
                }))
            }
        }
        return Promise.all(promises).then(() => {
            return keys;
        });
    }));
}


function addThumbnail(image) {
    if (store === null) return [];

    Queue.enqueue(() => get(`thumb_${image.id}`).then((storedImage) => {
        if (storedImage && storedImage === image.data) {
            DEBUG('Image thumbnail is the same for %s, not saving in storage', image.id);
            return storedImage
        }
        storedImage = image.data

        DEBUG('Saving image thumbnail in storage: %o', image.id);
        set(`thumb_${image.id}`, { data: image.data, contact: image.contact });
        idsInCache.add(`thumb_${image.id}`);
        return storedImage;
    }));
}

function add(item) {
    if (store === null) return [];

    Queue.enqueue(() => get(item.id).then((storedItem) => {
        if (storedItem && storedItem === item.data) {
            DEBUG('Cache item is the same for %s, not saving in storage', image.id);
            return storedImage
        }
        storedItem = item.data

        DEBUG('Saving item in cache storage: %o', item.id);
        set(item.id, { data: item.data, contact: item.contact });
        idsInCache.add(`${item.id}`);
        return storedItem;
    }));
}


exports.initialize = initialize;
exports.set = set;
exports.get = get;
exports.add = add;
exports.addThumbnail = addThumbnail;
exports.remove = remove;
exports.removeAll = removeAll;
exports.getAll = getAll;
exports.close = close;
exports.dropInstance = dropInstance;
exports.prime = prime;
exports.isCached = isCached;
