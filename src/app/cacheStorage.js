'use strict';

const localforage = require('localforage');
const debug = require('debug');

const { Queue } = require('./utils');

const DEBUG = debug('blinkrtc:cacheStorage');

let store = null;

const idsInCache = new Set();

class electronStorage {
    constructor(store) {
        this._store = store;
        this.ipcRenderer = window.require('electron').ipcRenderer;
        this._initializing = null;
        this.options = {};
    }

    init(account) {
        DEBUG('Initialize electron storage for file cache');
        this._initializing = new Promise((resolve, reject) => {
            const storage = this._store.getDataPath();
            this.options['dataPath'] = `${storage}/cache/${account}/`;
        })
    }

    ready() {
        return new Promise((resolve, reject) => {
            if (this._store === null) {
                if (this._initializing !== null) {
                    return this._initializing
                        .then(() => {
                            // DEBUG('Promise init fullfilled');
                            resolve();
                        });
                }
                DEBUG('File cache store is not being initialized, init was never called, calling it now');
                this.init();
                return this._initializing
                    .then(() => {
                        // DEBUG('Promise init fullfilled');
                        resolve()
                    });
            }
            resolve();
        });
    }

    _get(key) {
        return this.ready()
            .then(() => {
                // DEBUG('Store is ready to query');
                return new Promise((resolve, reject) => {
                    this._store.get(key, this.options, function(error, data) {
                        if (error) {
                            reject(error);
                            return;
                        }
                        if (JSON.stringify(data) === JSON.stringify({})) {
                            resolve(null);
                        } else {
                            resolve(data);
                        }
                    });
                });
            });
    }

    _set(key, value) {
        return this.ready().then(() => {
            return new Promise((resolve, reject) => {
                this._store.set(key, value, this.options, function(error) {
                    if (error) {
                        reject(error);
                        return;
                    }
                    resolve(value);
                })
            })
        });
    }

    _remove(key) {
        return this.ready().then(() => {
            return new Promise((resolve, reject) => {
                this._store.remove(key, this.options, function(error) {
                    if (error) {
                        reject(error);
                        return;
                    }
                    resolve();
                })
            })
        });
    }

    _clear() {
        return this.ready().then(() => {
            return new Promise((resolve, reject) => {
                this._store.clear(this.options, function(error) {
                    if (error) {
                        reject(error);
                        return;
                    }
                    resolve();
                })
            })
        });
    }

    getItem(key) {
        return this._get(key);
    }

    setItem(key, value) {
        return this._set(key, value);
    }

    removeItem(key) {
        return this._remove(key);
    }

    clear() {
        return this._clear();
    }

    keys() {
        return this.ready()
            .then(() => {
                return new Promise((resolve, reject) => {
                    this._store.keys(this.options, function(error, data) {
                        if (error) {
                            reject(error);
                            return;
                        }
                        if (JSON.stringify(data) === JSON.stringify([])) {
                            resolve(null);
                        } else {
                            resolve(data);
                        }
                    });
                });
            });
    }

    iterate(iterator) {
        return this.ready()
            .then(() => {
                return new Promise((resolve, reject) => {
                    // getAll has a bug, it splits the object on .
                    this.keys().then(data => {
                        if (JSON.stringify(data) === JSON.stringify([])) {
                            resolve();
                        } else {
                            let itertionNumber = 1;
                            let promises = [];
                            for (const key of data) {
                                promises.push(this._get(key).then((value) => {
                                    if (JSON.stringify(value) === JSON.stringify({})) {
                                        resolve(null);
                                    } else {
                                        let result = iterator(
                                            value,
                                            key,
                                            itertionNumber++
                                        );

                                        if (result !== void 0) {
                                            resolve(result);
                                        }
                                    }
                                }).catch(error => {
                                    reject(error);
                                    return;
                                }));
                            }
                            Promise.all(promises).then(() => {
                                resolve();
                            });
                        }
                    }).catch(error => {
                        reject(error);
                        return;
                    });
                });
            });
    }
}

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
            store = new electronStorage(electronStore);
            store.init(account);
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
