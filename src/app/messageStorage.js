'use strict';

const localforage = require('localforage');
const cacheStorage = require('./cacheStorage');
const debug = require('debug');

const { Queue } = require('./utils');

const DEBUG = debug('blinkrtc:MessageStorage');

let store = null;

const lastIdLoaded = new Map();
const lastFileIdLoaded = new Map();

const dateFormat = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z$/;
const dateFormat1 = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3,}[\+|-]\d{2}:\d{2}$/;

const idsInStorage = new Map();

class electronStorage {
    constructor(store) {
        this._store = store;
        this.ipcRenderer = window.require('electron').ipcRenderer;
        this._initializing = null;
        this.options = {};
    }

    init(account) {
        DEBUG('Initialize electron storage for messages');
        this._initializing = new Promise((resolve, reject) => {
            const storage = this._store.getDataPath();
            this.options['dataPath'] = `${storage}/messages/${account}/`;
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
    if (typeof value === 'string' && dateFormat1.test(value)) {
        return new Date(value);
    }
    return value;
}


function initialize(account, electronStore, electron = false) {
    DEBUG('Message store init');
    if (store === null) {
        if (!electron) {
            store = localforage.createInstance({
                driver: localforage.INDEXEDDB,
                name: 'Sylk',
                storeName: `messages_${account}`
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
    return Queue.enqueue(() => store.removeItem(key).then(() => {
        DEBUG('Removed conversation for %s', key);
        lastIdLoaded.delete(key);
        lastFileIdLoaded.delete(key);
        return;
    }));
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


function add(message) {
    if (store === null) return [];

    let contact = message.receiver;
    if (message.state === 'received') {
        contact = message.sender.uri;
    }
    Queue.enqueue(() => get(contact).then((messages) => {
        if (!messages) {
            messages = [];
        } else {
            for (let storedMessage of messages) {
                storedMessage = JSON.parse(storedMessage, _parseDates);
                if (message.id === storedMessage.id) {
                    DEBUG('NOT Saving message in storage: %o', message);
                    return
                }
            };
        }
        idsInStorage.set(message.id, message.state);
        messages.push(JSON.stringify(message));
        DEBUG('Saving message in storage: %o', message);
        set(contact, messages);
        return messages;
    }));
}


function removeMessage(message) {
    if (store === null) return {};

    let messages = [];

    let contact = message.receiver;
    if (message.state === 'received') {
        contact = message.sender.uri;
    }
    return Queue.enqueue(() => get(contact).then((storedMessages) => {
        if (storedMessages) {
            messages = storedMessages.filter((storedMessage) => {
                storedMessage = JSON.parse(storedMessage, _parseDates);
                if (message.id !== storedMessage.id) {
                    return true;
                }
                idsInStorage.delete(storedMessage.id);
                return false;
            });
            set(contact, messages);
        }
        return messages;
    }));
}


function update(message) {
    if (store === null) return [];
    if (message.messageId === undefined) {
        return;
    }

    let messages = [];
    let found = false;
    Queue.enqueue(() => store.iterate((storedMessages, key) => {
        let inStorage = idsInStorage.get(message.messageId);
        if (!inStorage || (inStorage && inStorage === message.state)) {
            return;
        }
        messages = storedMessages.map((storedMessage) => {
            storedMessage = JSON.parse(storedMessage, _parseDates);
            if (message.messageId === storedMessage.id && message.state !== storedMessage.state && storedMessage.state !== 'displayed') {
                if (storedMessage.state === 'delivered' && message.state === 'accepted') {
                    return
                }
                DEBUG('Updating state for stored message with id: %s (%s => %s)', storedMessage.id, storedMessage.state, message.state);
                storedMessage.state = message.state;
                idsInStorage.set(storedMessage.id, message.state)
                found = true;
            }
            return JSON.stringify(storedMessage);
        });
        if (found) {
            return [key, messages];
        }
    }).then((result) => {
        if (result !== undefined) {
            const [key, messages] = result;
            DEBUG('Saving state stored messages for: %s', key);
            set(key, messages);
            return messages;
        }
    }));
}


function updateDisposition(id, state) {
    if (store === null) return [];

    let messages = [];
    let found = false;
    Queue.enqueue(() => store.iterate((storedMessages, key) => {
        messages = storedMessages.map((storedMessage) => {
            storedMessage = JSON.parse(storedMessage, _parseDates);
            if (id === storedMessage.id && state !== storedMessage.dispositionState) {
                DEBUG('Updating dispositionState for stored message with id: %s', storedMessage.id);
                storedMessage.dispositionState = state;
                found = true;
            }
            return JSON.stringify(storedMessage);
        });
        if (found) {
            return [key, messages];
        }
    }).then((result) => {
        if (result !== undefined) {
            DEBUG('Saving stored messages for: %s', result[0]);
            set(result[0], result[1]);
            return messages;
        }
    }));
}


function loadLastMessages() {
    if (store === null) return Promise.resolve({});

    const lastMessages = {};
    const promises = [];
    return Queue.enqueue(() => store.keys().then((keys) => {
        if (keys) {
            for (let key of keys) {
                promises.push(store.getItem(key).then((messages) => {
                    if (messages) {
                        lastMessages[key] = _fixFileMessages(messages.slice(-30))
                            .filter(message => {
                                if (message.contentType === 'application/sylk-file-transfer' && message.isExpired) {
                                    return cacheStorage.isCached(message.id)
                                }
                                return true;
                            });


                        // lastMessages[key] = messages.map(message => JSON.parse(message, parseDates));
                        if (lastMessages[key].length !== 0) {
                            lastIdLoaded.set(key, lastMessages[key][0].id);
                            lastFileIdLoaded.set(key, lastMessages[key][0].id);
                        } else {
                            delete lastMessages[key];
                        }
                    }
                }))
            }
        }
        return Promise.all(promises).then(() => {
            return lastMessages;
        });
    }));
}

function _fixFileMessages(messages) {
    return messages.map(message => {
        let fixedMessage = JSON.parse(message, _parseDates);
        if (fixedMessage.contentType == 'application/sylk-file-transfer') {
            let json = {};
            let error = false;
            try {
                json = JSON.parse(fixedMessage.content, _parseDates)
            } catch (e) {
                error = true;
            }
            fixedMessage = {
                ...fixedMessage,
                get json() {
                    return json;
                },
                get jsonError() {
                    return error;
                },
                get isExpired() {
                    return json.until && new Date(json.until) < new Date();
                }
            }
        }
        return fixedMessage
    });
}

function loadMoreFiles(key) {
    if (store === null) return {};

    let lastMessages = [];
    let loadExtraItems = 200;

    return Queue.enqueue(() => store.getItem(key).then((messages) => {
        if (messages) {
            lastMessages = _fixFileMessages(messages);

            DEBUG('Chat has %s stored messages', lastMessages.length);

            const matchesId = (element) => element.id === lastFileIdLoaded.get(key);
            const index = lastMessages.findIndex(matchesId);
            let startIndex = loadExtraItems
            if (index == 0) {
                return;
            }
            if (index < startIndex) {
                lastMessages = lastMessages.slice(0, index);
                lastFileIdLoaded.set(key, lastMessages[0].id);
            } else {
                startIndex = index - startIndex;
                while (true) {
                    if (startIndex < 0) {
                        startIndex = 0;
                    }
                    let lastMessagesSlice = lastMessages.slice(startIndex, index);
                    lastMessagesSlice = lastMessagesSlice.filter(message => {
                        if (message.contentType === 'application/sylk-file-transfer' && message.isExpired) {
                            return cacheStorage.isCached(message.id)
                        }
                        return true;
                    });
                    if (startIndex === 0 && lastMessagesSlice.length === 0) {
                        lastIdLoaded.set(key, lastMessages[0].id);
                        lastMessages = lastMessagesSlice;
                        break;
                    }
                    if (lastMessagesSlice.length === loadExtraItems || startIndex === 0) {
                        lastMessages = lastMessagesSlice;
                        lastFileIdLoaded.set(key, lastMessages[0].id);
                        break;
                    }
                    startIndex = startIndex - loadExtraItems + lastMessagesSlice.length;
                }
            }
            if (lastMessages.length === 0) {
                return
            }
            return lastMessages
        }
    }));

}

function loadMoreMessages(key) {
    if (store === null) return {};

    let lastMessages = [];
    let loadExtraItems = 30;
    return Queue.enqueue(() => store.getItem(key).then((messages) => {
        if (messages) {
            lastMessages = _fixFileMessages(messages);

            DEBUG('Chat has %s stored messages', lastMessages.length);

            const matchesId = (element) => element.id === lastIdLoaded.get(key);
            const index = lastMessages.findIndex(matchesId);
            let startIndex = loadExtraItems;
            if (index == 0) {
                return;
            }
            if (index < startIndex) {
                lastMessages = lastMessages.slice(0, index);
                lastIdLoaded.set(key, lastMessages[0].id);
            } else {
                startIndex = index - startIndex;
                while (true) {
                    if (startIndex < 0) {
                        startIndex = 0;
                    }
                    let lastMessagesSlice = lastMessages.slice(startIndex, index);
                    lastMessagesSlice = lastMessagesSlice.filter(message => {
                        if (message.contentType === 'application/sylk-file-transfer' && message.isExpired) {
                            return cacheStorage.isCached(message.id)
                        }
                        return true;
                    });
                    if (startIndex === 0 && lastMessagesSlice.length === 0) {
                        lastIdLoaded.set(key, lastMessages[0].id);
                        lastMessages = lastMessagesSlice;
                        break;
                    }
                    if (lastMessagesSlice.length === loadExtraItems || startIndex === 0) {
                        lastMessages = lastMessagesSlice;
                        lastIdLoaded.set(key, lastMessages[0].id);
                        break;
                    }
                    startIndex = startIndex - loadExtraItems + lastMessagesSlice.length;
                }
            }

            if (lastMessages.length === 0) {
                return
            }
            return lastMessages
        }
    }));
}


function hasMore(key) {
    if (store === null) return false;

    return store.getItem(key).then((messages) => {
        if (messages && lastIdLoaded.get(key) !== undefined) {
            let lastMessages = messages.map(message => JSON.parse(message, _parseDates));
            const matchesId = (element) => element.id === lastIdLoaded.get(key);
            const index = lastMessages.findIndex(matchesId);
            if (index == 0) {
                DEBUG('%s has no more messages to load', key);
                return false;
            }
            DEBUG('%s has more messages to load', key);
            return true;
        }
    });
}

function hasMoreFiles(key) {
    if (store === null) return false;

    return store.getItem(key).then((messages) => {
        if (messages && lastFileIdLoaded.get(key) !== undefined) {
            let lastMessages = messages.map(message => JSON.parse(message, _parseDates));
            const matchesId = (element) => element.id === lastFileIdLoaded.get(key);
            const index = lastMessages.findIndex(matchesId);
            if (index == 0) {
                DEBUG('%s has no more files to load', key);
                return false;
            }
            DEBUG('%s has more messages to load', key);
            return true;
        }
    });
}

function updateIdMap() {
    return Queue.enqueue(() => new Promise((resolve) => {
        idsInStorage.clear();
        store.iterate((storedMessages, key) => {
            for (let storedMessage of storedMessages) {
                storedMessage = JSON.parse(storedMessage, _parseDates);
                idsInStorage.set(storedMessage.id, storedMessage.state)
            }
        }).then(() => {
            resolve()
        });
    }))
}

function revertFiles(key) {
    lastFileIdLoaded.set(key, lastIdLoaded.get(key));
}

exports.initialize = initialize;
exports.set = set;
exports.get = get;
exports.add = add;
exports.remove = remove;
exports.dropInstance = dropInstance;
exports.update = update;
exports.close = close;

exports.updateDisposition = updateDisposition;
exports.loadLastMessages = loadLastMessages;
exports.loadMoreMessages = loadMoreMessages;
exports.loadMoreFiles = loadMoreFiles;
exports.removeMessage = removeMessage;
exports.hasMore = hasMore;
exports.hasMoreFiles = hasMoreFiles;
exports.revertFiles = revertFiles;
exports.updateIdMap = updateIdMap;
