'use strict';

(function () {
    // Don't set things up twice if the script runs again in the same document
    if (document.getElementById('osx-titlebar-style')) {
        return;
    }

    const titlebar = require('titlebar');
    const electron = require('electron');
    const ipc = electron.ipcRenderer;

    // Everything interactive must be no-drag, because the strip below is a drag region
    const style = document.createElement('style');
    style.id = 'osx-titlebar-style';
    style.textContent = `
        .navbar-header { padding-left: 48.5px; }
        a, button, input, select, textarea, label, li, [role="button"], [tabindex],
        .dropdown-menu, .titlebar-stoplight { -webkit-app-region: no-drag; }
    `;
    document.head.appendChild(style);

    // Draggable strip across the top of every view, first in the DOM
    const strip = document.createElement('div');
    strip.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:50px;-webkit-app-region:drag;z-index:0;pointer-events:none;';
    document.body.prepend(strip);

    // setup titlebar (draggable: false, so it adds no drag region of its own)
    const titleBar = titlebar({ disableFullScreen: true, draggable: false });
    titleBar.element.style.position = 'absolute';
    titleBar.element.style.top = 0;
    titleBar.element.style.left = 0;
    titleBar.element.style.height = '50px';
    titleBar.element.style['background-color'] = 'transparent';
    titleBar.element.style['transform-style'] = 'preserve-3d';
    titleBar.element.style['z-index'] = '9999';

    const stopLights = titleBar.element.children[0];
    stopLights.style.position = 'relative';
    stopLights.style.top = '50%';
    stopLights.style.transform = 'translateY(-50%)';

    titleBar.appendTo(document.body);

    titleBar.on('close', function () {
        ipc.send('close');
    });

    titleBar.on('minimize', function () {
        ipc.send('minimize');
    });

    // show / hide titlebar when going fullscreen
    document.addEventListener('webkitfullscreenchange', () => {
        if (document.webkitIsFullScreen) {
            titleBar.element.style.display = 'none';
        } else {
            titleBar.element.style.display = '';
        }
    }, false);
})();
