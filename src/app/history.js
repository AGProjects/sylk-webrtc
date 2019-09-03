'use strict';

const storage = require('./storage');


function add(uri) {
    return load().then((history) => {
        if (history) {
            const idx = history.indexOf(uri);
            if (idx !== -1) {
                history.splice(idx, 1);
            }
            history.unshift(uri);
            // keep just the last 50
            history = history.slice(0, 50);
        } else {
            history = [uri];
        }
        storage.set('history', history);
        return history;
    });
}

function load() {
    return storage.get('history');
}

function clear() {
    return storage.remove('history');
}

exports.add = add;
exports.load = load;
exports.clear =  clear;
