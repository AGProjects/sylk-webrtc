'use strict';

const localforage = require('localforage');


let store = null;

function initialize() {
    if (store === null) {
        store = localforage.createInstance({
            driver: localforage.LOCALSTORAGE,
            name: 'Blink'
        });
    }
}


function set(key, value) {
    return store.setItem(key, value);
}


function get(key) {
    return store.getItem(key);
}


exports.initialize = initialize;
exports.set = set;
exports.get = get;
