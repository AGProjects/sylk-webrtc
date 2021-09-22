'use strict';

const localforage = require('localforage');
const debug       = require('debug');

const { Queue }   = require('./utils');

const DEBUG = debug('blinkrtc:keyStorage');

let store = null;

const dateFormat = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z$/;


class electronStorage {
    constructor(store) {
        this._store = store;
        this.ipcRenderer = window.require('electron').ipcRenderer;
        this._initializing = null;
        this.options = {};
    }

    init(account) {
        DEBUG('Initialize electron storage for keys');
        this._initializing = new Promise((resolve, reject) => {
            const storage = this._store.getDataPath();
            this.options['dataPath'] = `${storage}/keys/${account}/`;
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
                DEBUG('Store is not being initialized, init was never called, calling it now');
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
        return this._set(key,value);
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


function _parseDates(key, value) {
    if (typeof value === 'string' && dateFormat.test(value)) {
        return new Date(value);
    }
    return value;
}


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
            store = new electronStorage(electronStore);
            store.init(account);
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
