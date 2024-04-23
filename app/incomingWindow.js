'use strict';
const electron = require('electron');
const ipcRenderer = electron.ipcRenderer;

document.addEventListener('keyup', onKeyUp);

const div = document.createElement("div");
div.style.position = "absolute";
div.style.top = 0;
div.style.left = 0;
div.style.height = "32px";
div.style.width = "100%";
div.style.background = "transparent"
div.style["-webkit-app-region"] = "drag";
document.body.appendChild(div);

function onKeyUp(event) {
    switch (event.which) {
        case 27:
            // ESC
            ipcRenderer.send('button', 'decline');
            break;
        case 13:
            let btn = document.getElementById('accept') || document.getElementById('audio');
            ipcRenderer.send('button', btn.id);
        default:
            break;
    }
};

ipcRenderer.on('updateContent', function(event, store) {
    document.querySelector('#app').innerHTML = store;

    for (let btn of document.getElementsByTagName('button')) {
        btn.addEventListener('click', (event) => {
            ipcRenderer.send('buttonClick', `${btn.id}`);
        });
    }
});

ipcRenderer.on('updateStyles', function(event, store) {
    const newStyleEl = document.createElement('style');
    newStyleEl.appendChild(document.createTextNode(store));
    document.head.appendChild(newStyleEl)
});

0;
