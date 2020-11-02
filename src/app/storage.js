'use strict';

const localforage = require('localforage');
const debug       = require('debug');

const DEBUG = debug('blinkrtc:Storage');

let store = null;


class electronStorage {
    constructor() {
        this._store = null;
        this.ipcRenderer = window.require('electron').ipcRenderer;
        this._initializing = null;
    }

    init() {
        DEBUG('Initialize electron storage');
        this._initializing = new Promise((resolve, reject) => {
            this.ipcRenderer.send('getStorage');
            this.ipcRenderer.on('storagePath', (event, storage) => {
                DEBUG('Storage path received');
                let _store = window.require('electron-json-storage');
                _store.setDataPath(storage);
                this._migrateFromLocalStorage(_store)
                    .then(() => resolve())
                    .catch((error) => {
                        DEBUG(`Migration failed: ${error}`);
                        resolve();
                    })
            });
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

    _migrateFromLocalStorage(_store) {
        return new Promise((resolve, reject) => {
            _store.get('migrated', (error, data)  => {
                if (error) {
                    this._store = _store;
                    reject(error);
                    return;
                }

                if (JSON.stringify(data) === JSON.stringify({})) {
                    DEBUG('Attempting to migrate old data');
                    store = localforage.createInstance({
                        driver: localforage.LOCALSTORAGE,
                        name: 'Blink'
                    });
                    const migrateKeys = ['account', 'history', 'devices'];
                    let promises = [];
                    migrateKeys.forEach((key, index) => {
                        promises.push(
                            get(key).then(value => {
                                return new Promise((resolve, reject) => {
                                    _store.set(key, value, function(error) {
                                        if (error) {
                                            reject(error);
                                            return;
                                        }
                                        DEBUG('Migrating: ' + key + ', value: ' + JSON.stringify(value));
                                        resolve(value);
                                    });
                                });
                            })
                            .catch((error) => {
                                DEBUG('Migrating: ' + key + ' failed');
                                return error;
                            })
                    );
                    });
                    Promise.all(promises)
                        .then((values) => {
                            // DEBUG('Promise all fullfilled');
                            return new Promise((resolve, reject) => {
                                _store.set('migrated', true, function(error) {
                                    if (error) {
                                        reject(error);
                                    }
                                    resolve();
                                })
                            })
                        })
                        .catch((error) => {
                            DEBUG('Setting migration flag failed');
                        })
                        .then(()=> {
                            this._store = _store;
                            store = this;
                            resolve();
                        })
                } else {
                    DEBUG('Old data is already migrated');
                    this._store = _store;
                    resolve();
                }
            });
        });
    }

    _get(key) {
        return this.ready()
            .then(() => {
                // DEBUG('Store is ready to query');
                return new Promise((resolve, reject) => {
                    DEBUG('Fetch: ' + key);
                    this._store.get(key, function(error, data) {
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
                this._store.set(key, value, function(error) {
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
                this._store.remove(key, function(error) {
                    if (error) {
                        reject(error);
                        return;
                    }
                    resolve(value);
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
        return this._remove(key,value);
    }
}


function initialize(electron = false) {
    if (store === null) {
        if (!electron) {
            store = localforage.createInstance({
                driver: localforage.LOCALSTORAGE,
                name: 'Blink'
            });
        } else {
            store = new electronStorage();
            store.init();
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

exports.initialize = initialize;
exports.set = set;
exports.get = get;
exports.remove = remove;
