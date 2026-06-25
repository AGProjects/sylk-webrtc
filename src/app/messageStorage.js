'use strict';

const localforage = require('localforage');
const cacheStorage = require('./cacheStorage');
const mainStorage = require('./storage');
const debug = require('debug');

const electronStorage = require('./electronStorage');
const { Queue } = require('./utils');


const DEBUG = debug('blinkrtc:MessageStorage');

let store = null;
let metadataStore = null;

const lastIdLoaded = new Map();
const lastFileIdLoaded = new Map();

const dateFormat = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z$/;
const dateFormat1 = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3,}[\+|-]\d{2}:\d{2}$/;

const idsInStorage = new Map();

function _parseDates(key, value) {
    if (typeof value === 'string' && dateFormat.test(value)) {
        return new Date(value);
    }
    if (typeof value === 'string' && dateFormat1.test(value)) {
        return new Date(value);
    }
    return value;
}


function migrateMetadataMessages(account) {
    return mainStorage.get(`metadata_migrated-${account}`).then(value => {
        if (value === true) {
            DEBUG('Metadata migration already done');
            return true;
        }
        return Queue.enqueue(() => store.keys().then(keys => {
            if (!keys) return;
            return Promise.all(keys.map(key => {
                return store.getItem(key).then(storedMessages => {
                    if (!storedMessages) return;
                    let changed = false;
                    const toMigrate = [];
                    const msgs = storedMessages.filter(m => {
                        const parsed = JSON.parse(m, _parseDates);
                        if (parsed.contentType === 'application/sylk-message-metadata') {
                            changed = true;
                            let json = {};
                            try {
                                json = JSON.parse(parsed.content, _parseDates);
                            } catch (e) { return false; }
                            if (!json.messageId) return false;
                            toMigrate.push(json);
                            return false;
                        }
                        return true;
                    });
                    const seen = new Set();
                    const uniqueMigrate = toMigrate.reverse().filter(json => {
                        const key = `${json.messageId}:${json.action}`;
                        if (seen.has(key)) return false;
                        seen.add(key);
                        return true;
                    });
                    return Promise.all(uniqueMigrate.map(json =>
                        metadataStore.getItem(json.messageId).then(existing => {
                            const entries = existing || [];
                            const idx = entries.findIndex(e => e.action === json.action);
                            if (idx !== -1) {
                                DEBUG('Metadata message updated')
                                entries[idx] = json;
                            } else {
                                DEBUG('Metadata message stored')
                                entries.push(json);
                            }
                            return metadataStore.setItem(json.messageId, entries);
                        })
                    )).then(() => {
                        if (changed) {
                            const enriched = msgs.map(m => {
                                const parsed = JSON.parse(m, _parseDates);
                                const meta = uniqueMigrate.filter(j => j.messageId === parsed.id);
                                if (meta.length > 0) {
                                    DEBUG('Metadata found for message id: %s, attaching metadata', parsed.id);
                                    parsed.metadata = meta;
                                    return JSON.stringify(parsed);
                                }
                                return m;
                            });
                            return set(key, enriched);
                        }
                    });
                });
            }));
        })).then(() => {
            mainStorage.set(`metadata_migrated-${account}` , true);
            DEBUG('Metadata migration done');
        }).catch((err) => {
            DEBUG('Migration error: %o', err);
        });
    });
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
            metadataStore = localforage.createInstance({
                driver: localforage.INDEXEDDB,
                name: 'Sylk',
                storeName: `metadata_${account}`
            });
        } else {
            store = new electronStorage(electronStore, { debug: DEBUG });
            store.init(account, 'messages');
            metadataStore = new electronStorage(electronStore, { debug: DEBUG });
            metadataStore.init(account, 'metadata');
        }
        migrateMetadataMessages(account);
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
        return Promise.all([store.clear(), metadataStore.clear()]);
    }
    return Promise.all([store.dropInstance(), metadataStore.dropInstance()]);
}


function close() {
    store = null;
    metadataStore = null;
    return;
}

function addMetadata(message) {
    if (message.jsonError || !message.json || !message.json.messageId) return Promise.resolve();

    const messageId = message.json.messageId;
    const meta = { ...message.json }

    let contact = message.receiver;
    if (message.state === 'received') {
        contact = message.sender.uri;
    }
    const enrichMeta = () => {
        if (meta.action !== 'reply' || !meta.value) return Promise.resolve(meta);

        return Queue.enqueue(() => get(contact).then(storedMessages => {
            if (!storedMessages) return meta;
            const original = storedMessages.map(m => JSON.parse(m, _parseDates))
                .find(m => m.id === meta.value);
            if (original) {
                meta.snapshot = original;
            }
            return meta;
        }));
    };

    return enrichMeta().then((enrichedMeta) => {
        const metaPromise = Queue.enqueue(() => metadataStore.getItem(messageId).then(existing => {
            const entries = existing || [];
            const idx = entries.findIndex(m => m.action === message.json.action);
            if (idx !== -1) {
                DEBUG('Metadata updated');
                entries[idx] = enrichedMeta; // replace existing
            } else {
                DEBUG('Metadata stored');
                entries.push(enrichedMeta); // new action type
            }
            return metadataStore.setItem(messageId, entries);
        }));

        if (!idsInStorage.has(messageId)) return Promise.resolve(); // not stored yet, nothing to update

        return Promise.all([metaPromise, Queue.enqueue(() => get(contact).then(storedMessages => {
            if (!storedMessages) return;
            const msgs = storedMessages.map(m => {
                const parsed = JSON.parse(m, _parseDates);
                if (parsed.id !== messageId) return m;
                parsed.metadata = parsed.metadata || [];
                const idx = parsed.metadata.findIndex(m => m.action === message.json.action);
                if (idx !== -1) {
                    DEBUG('Message metadata updated');
                    parsed.metadata[idx] = enrichedMeta;
                } else {
                    DEBUG('Message metadata added');
                    parsed.metadata.push(enrichedMeta);
                }
                return JSON.stringify(parsed);
            });
            set(contact, msgs);
        }))]);
    });
}

function add(message) {
    if (store === null) return Promise.resolve([]);

    let contact = message.receiver;
    if (message.state === 'received') {
        contact = message.sender.uri;
    }

    if (message.contentType === 'application/sylk-message-metadata') {
        DEBUG('Storing metadata message');
        return addMetadata(message);
    }

    return Queue.enqueue(() => get(contact).then((messages) => {
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

        return metadataStore.getItem(message.id).then(metadata => {
            DEBUG('Old metadata found for message, appending metadata to message');
            const plain = { ...message.toJSON(), metadata: metadata || [] };
            messages.push(JSON.stringify(plain));
            set(contact, messages);
        });
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
                if (storedMessage.contentType === 'application/sylk-file-transfer') {
                    metadataStore.removeItem(storedMessage.id);
                }
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
        if (fixedMessage.metadata) {
            fixedMessage.metadata = fixedMessage.metadata.map(meta => {
                if (meta.snapshot) {
                    meta.snapshot = _fixFileMessages([JSON.stringify(meta.snapshot)])[0];
                }
                return meta;
            });
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

function hasFileTypes(key) {
    if (store === null) return Promise.resolve({ images: false, files: false, voice: false });

    return store.getItem(key).then((messages) => {
        if (!messages) return { images: false, files: false, voice: false };

        let images = false, files = false, voice = false;
        for (let message of messages) {
            const parsed = JSON.parse(message, _parseDates);
            if (parsed.contentType !== 'application/sylk-file-transfer') continue;
            let json = {};
            try { json = JSON.parse(parsed.content, _parseDates); } catch(e) { continue; }
            if (!json.filetype) continue;
            if (json.filename?.startsWith('sylk-audio-recording')) {
                voice = true;
            } else if (json.filetype.startsWith('image/') || json.filetype.startsWith('video/')) {
                images = true;
            } else {
                files = true;
            }
            if (images && files && voice) break;
        }
        return { images, files, voice };
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

function getMetadata(messageId) {
    return metadataStore.getItem(messageId);
}

function fixMessage(message) {
    return _fixFileMessages([JSON.stringify(message)])[0];
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
exports.hasFileTypes = hasFileTypes;
exports.revertFiles = revertFiles;
exports.updateIdMap = updateIdMap;
exports.getMetadata = getMetadata;
exports.fixMessage = fixMessage;
