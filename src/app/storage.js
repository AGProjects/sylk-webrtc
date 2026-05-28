'use strict';

const localforage = require('localforage');
const debug       = require('debug');

const electronStorageBase = require('./electronStorage');
const DEBUG = debug('blinkrtc:Storage');

let store = null;


class electronStorage extends electronStorageBase {
    constructor() {
        super(null, { debug: DEBUG });
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


function instance() {
    if (typeof store.instance == 'function') {
        return store.instance();
    }
    return;
}


exports.initialize = initialize;
exports.set = set;
exports.get = get;
exports.remove = remove;
exports.instance = instance;
