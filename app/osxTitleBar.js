'use strict';

const titlebar = require('titlebar');
const electron = require('electron');
const ipc = electron.ipcRenderer;


// setup a draggable area at the top of the window

const div = document.createElement("div");
div.style.position = "absolute";
div.style.top = 0;
div.style.left = 0;
div.style.height = "50px";
div.style.width = "100%";
div.style["-webkit-app-region"] = "drag";
document.body.appendChild(div);


// setup titlebar

const titleBar = titlebar({disableFullScreen: true});
titleBar.element.style.position = "absolute";
titleBar.element.style.top = 0;
titleBar.element.style.left = 0;
titleBar.element.style.height = "50px";
titleBar.element.style["background-color"] = "transparent";
titleBar.element.style["transform-style"] = "preserve-3d";
titleBar.element.style["z-index"] = "9999";

const stopLights = titleBar.element.children[0];
stopLights.style.position = "relative";
stopLights.style.top = "50%";
stopLights.style.transform = "translateY(-50%)";

titleBar.appendTo(document.body);

titleBar.on('close', function () {
  ipc.send('close')
})

titleBar.on('minimize', function () {
  ipc.send('minimize')
})


// show / hide titlebar when going fullscreen

document.addEventListener('webkitfullscreenchange', (e) => {
    if (document.webkitIsFullScreen) {
        titleBar.element.style.display = "none";
    } else {
        titleBar.element.style.display = "";
    }
}, false);
