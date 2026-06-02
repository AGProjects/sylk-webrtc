
class electronStorage {
    constructor(store, { debug } = {}) {
        this._store = store;
        this.ipcRenderer = window.require('electron').ipcRenderer;
        this._initializing = null;
        this.debug = debug || (() => { })
        this.options = {};
    }

    init(account, dataPath = null) {
        if (!dataPath) {
            this.debug('Can not initialize electron storage, no path given');
            return Promise.reject(new Error('No dataPath'));
        }
        this.debug(`Initialize electron storage for ${dataPath}`);
        this._initializing = new Promise((resolve, reject) => {
            const storage = this._store.getDataPath();
            this.options['dataPath'] = `${storage}/${dataPath}/${account}/`;
            resolve();
        })
    }

    ready() {
        return new Promise((resolve, reject) => {
            if (this._store === null) {
                if (this._initializing !== null) {
                    return this._initializing
                        .then(() => {
                            // this.debug('Promise init fullfilled');
                            resolve();
                        });
                }
                this.debug('Store is not being initialized, init was never called, calling it now');
                this.init();
                return this._initializing
                    .then(() => {
                        // this.debug('Promise init fullfilled');
                        resolve()
                    });
            }
            resolve();
        });
    }

    _get(key) {
        return this.ready()
            .then(() => {
                // this.debug('Store is ready to query');
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
                        if (data === null || JSON.stringify(data) === JSON.stringify([])) {
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
                                })
                                );
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

    instance() {
        return this._store;
    }
}

module.exports = electronStorage;
