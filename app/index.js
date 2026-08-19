
const electron = require('electron');
const Notification = electron.Notification
const fs = require('fs');
const openAboutWindow = require('about-window').default;
const Badge = require('electron-windows-badge');
const path = require('path');

const app = electron.app;
const BrowserWindow = electron.BrowserWindow;
const dialog = electron.dialog;
const Menu = electron.Menu;
const ipc = electron.ipcMain;
const shell = electron.shell;

// --- Remote-pointer overlay -------------------------------------------------
// A transparent, click-through, always-on-top window that draws a brief pulsing
// marker at a normalized (0..1) point on the shared display. Used by the
// remote-pointer feature: while this desktop shares its screen, the remote peer
// clicks the shared video and we draw "look here" over our real screen so it
// appears in the shared stream. Purely visual; never intercepts input. The dot
// is positioned via executeJavaScript from here, so the overlay page needs no
// node integration.
//
// The marker is placed from SCREEN coordinates against the window's REAL bounds
// rather than from the display size: the OS can refuse to give the window the
// whole display (the macOS menu bar, a dock on a screen edge), and assuming the
// window covers the display then lands every marker shifted and slightly scaled.
const POINTER_OVERLAY_HIDE_DELAY = 1100;
// Overlays are kept around briefly after the last point so repeated pointing
// stays instant, then torn down rather than left resident for the session.
const POINTER_OVERLAY_REAP_DELAY = 60000;

const POINTER_OVERLAY_HTML = '<!doctype html><html><head><meta charset="utf-8"><style>'
    + 'html,body{margin:0;width:100%;height:100%;background:transparent;overflow:hidden}'
    + '#dot{box-sizing:border-box;position:absolute;width:46px;height:46px;margin:-23px 0 0 -23px;border-radius:50%;'
    + 'border:4px solid #2196F3;background:rgba(33,150,243,.22);box-shadow:0 0 0 4px rgba(33,150,243,.35);'
    + 'opacity:0;transition:opacity .12s}#dot.on{animation:pulse .38s ease-out 2}'
    + '@keyframes pulse{0%{transform:scale(.7);opacity:.95}100%{transform:scale(1.9);opacity:0}}'
    + '</style></head><body><div id="dot"></div><script>'
    + 'window.__setPoint=function(px,py){var d=document.getElementById("dot");'
    + 'd.style.left=px+"px";d.style.top=py+"px";'
    + 'd.classList.remove("on");void d.offsetWidth;d.classList.add("on");d.style.opacity=1;clearTimeout(window.__t);'
    + 'window.__t=setTimeout(function(){d.style.opacity=0;d.classList.remove("on");},760);};'
    + '</script></body></html>';

// One overlay per display, keyed by display id, so two calls sharing two
// different screens do not fight over a single window.
const pointerOverlays = new Map();

function pointerOverlayDisplay(displayId) {
    if (displayId !== undefined && displayId !== null && displayId !== '') {
        const match = electron.screen.getAllDisplays().find((d) => String(d.id) === String(displayId));
        if (match) { return match; }
    }
    return electron.screen.getPrimaryDisplay();
}

function pointerOverlayFor(display) {
    const key = String(display.id);
    let overlay = pointerOverlays.get(key);
    if (overlay && !overlay.win.isDestroyed()) {
        return overlay;
    }

    const b = display.bounds;
    const win = new BrowserWindow({
        x: b.x, y: b.y, width: b.width, height: b.height,
        transparent: true, frame: false, resizable: false, movable: false,
        minimizable: false, maximizable: false, focusable: false,
        skipTaskbar: true, hasShadow: false, alwaysOnTop: true,
        webPreferences: { backgroundThrottling: false }
    });
    win.setIgnoreMouseEvents(true);
    try { win.setAlwaysOnTop(true, 'screen-saver'); } catch (e) {}
    try { win.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true }); } catch (e) {}
    win.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(POINTER_OVERLAY_HTML));

    overlay = { win: win, hideTimer: null, reapTimer: null, loading: true };
    // Only drop our own entry: a replacement may already have taken this key.
    win.on('closed', () => {
        if (pointerOverlays.get(key) === overlay) { pointerOverlays.delete(key); }
    });
    pointerOverlays.set(key, overlay);
    return overlay;
}

function reapPointerOverlay(overlay) {
    clearTimeout(overlay.hideTimer);
    clearTimeout(overlay.reapTimer);
    overlay.hideTimer = null;
    overlay.reapTimer = null;
    try { if (!overlay.win.isDestroyed()) { overlay.win.destroy(); } } catch (e) {}
}

function showPointerOverlay(p) {
    if (!p || typeof p.x !== 'number' || typeof p.y !== 'number') { return; }
    const display = pointerOverlayDisplay(p.displayId);
    const b = display.bounds;
    const overlay = pointerOverlayFor(display);
    const win = overlay.win;

    // Re-assert the geometry every time: the share can move to another display,
    // and the resolution can change under us.
    try { win.setBounds({ x: b.x, y: b.y, width: b.width, height: b.height }); } catch (e) {}
    let wb = b;
    try { wb = win.getBounds(); } catch (e) {}
    // normalized point -> screen coordinates -> coordinates local to the window
    // as the OS actually placed and sized it.
    const px = Math.round(b.x + p.x * b.width - wb.x);
    const py = Math.round(b.y + p.y * b.height - wb.y);
    const deliver = () => {
        try { win.webContents.executeJavaScript('window.__setPoint&&window.__setPoint(' + px + ',' + py + ')'); } catch (e) {}
    };
    if (overlay.loading || win.webContents.isLoading()) {
        overlay.loading = false;
        win.webContents.once('did-finish-load', deliver);
    } else {
        deliver();
    }
    try { win.showInactive(); } catch (e) {}
    clearTimeout(overlay.hideTimer);
    overlay.hideTimer = setTimeout(() => {
        try { if (!win.isDestroyed()) { win.hide(); } } catch (e) {}
    }, POINTER_OVERLAY_HIDE_DELAY);
    clearTimeout(overlay.reapTimer);
    overlay.reapTimer = setTimeout(() => { reapPointerOverlay(overlay); }, POINTER_OVERLAY_REAP_DELAY);
}

function destroyPointerOverlays() {
    for (const overlay of pointerOverlays.values()) {
        reapPointerOverlay(overlay);
    }
    pointerOverlays.clear();
}

const { autoUpdater } = require('electron-updater')
const ProgressBar = require('electron-progressbar');
const log = require('electron-log');
const storage = require('electron-json-storage');

let updater = null;
log.transports.file.level = 'debug';
autoUpdater.autoDownload = false;
autoUpdater.logger = log;

let progressBar;
let notification;
let updateWindow = null;

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let mainWindow;

// Keep old storage
app.setPath('userData', path.join(app.getPath('appData'), 'Sylk'));

autoUpdater.on('error', (error) => {
    if (updater != null) {
        if (progressBar != null) {
            progressBar.close();
        }

        if (error.code === 'ERR_UPDATER_CHANNEL_FILE_NOT_FOUND') {
            error = 'Cannot find the channel file for the updates';
        }

        dialog.showErrorBox('There was an error updating Sylk:', error == null ? 'unknown' : error.toString());
        updater.enabled = true;
        updater = null;
    }
});

autoUpdater.on('update-available', (info) => {
    if (updater == null) {
        notification = new Notification({
            title: 'A new version is ready to download',
            body: `${app.getName()} version ${info.version} can be downloaded and installed`
        });
        notification.on('click', () => {
            createUpdateDialog(info);
        });
        notification.show();
    } else {
        createUpdateDialog(info);
    }
});

// No update available
autoUpdater.on('update-not-available', () => {
    if (updater != null) {
        dialog.showMessageBox({
            title: 'You\'re up-to-date!',
            message: 'Current version is up-to-date.',
            buttons: ['OK']
        });
        updater.enabled = true;
        updater = null;
    }
});

// There is progress in the download
autoUpdater.on('download-progress', (progressObj) => {
    progressBar.value = progressObj.percent;
    progressBar.detail = `Downloading...  ${(progressObj.bytesPerSecond / 1000).toFixed(2)} KB/s (${(progressObj.transferred / 1000000).toFixed(2)} MB / ${(progressObj.total / 1000000).toFixed(2)} MB)`;
});

// The update is downloaded
autoUpdater.on('update-downloaded', () => {
    progressBar.setCompleted();
    progressBar.close();

    dialog.showMessageBox({
        title: 'Ready to Install',
        message: 'The software has been downloaded. Click Restart to relaunch the new version...',
        buttons: ['Restart']
    }).then(() => {
        ensureSafeQuitAndInstall();
    });
});


// for platform specific tricks
const isDarwin = process.platform === 'darwin';
const isLinux = process.platform === 'linux';


// Flag indicating if we are about to quit
let quitting = false;

// options for about window
const aboutOptions = {
    icon_path: `${__dirname}/www/assets/images/blink.ico`,
    copyright: 'Copyright (c) AG Projects',
    homepage: 'http://sylkserver.com',
    win_options: {
        titleBarStyle: 'hiddenInset'
    }
};

// Application menu
const appMenu = Menu.buildFromTemplate([{
    label: 'Blink',
    submenu: [
        { label: 'Check for updates...', click: (item, win, event) => { checkForUpdates(item, win, event); } },
        { label: 'About', click: () => { openAboutWindow(Object.assign({}, aboutOptions)); } },
        { label: 'Quit', accelerator: 'Command+Q', click: () => { app.quit(); } }
    ]
}, {
    label: 'Edit',
    submenu: [
        { label: 'Undo', accelerator: 'CmdOrCtrl+Z', selector: 'undo:' },
        { label: 'Redo', accelerator: 'Shift+CmdOrCtrl+Z', selector: 'redo:' },
        { type: 'separator' },
        { label: 'Cut', accelerator: 'CmdOrCtrl+X', selector: 'cut:' },
        { label: 'Copy', accelerator: 'CmdOrCtrl+C', selector: 'copy:' },
        { label: 'Paste', accelerator: 'CmdOrCtrl+V', selector: 'paste:' },
        { label: 'Select All', accelerator: 'CmdOrCtrl+A', selector: 'selectAll:' }
    ]
}, {
    label: 'Debug',
    submenu: [
        { label: 'Open DevTools', click: () => { mainWindow.webContents.openDevTools({ mode: 'detach' }); } }
    ]
}
]);

function ensureSafeQuitAndInstall() {
    app.removeAllListeners('window-all-closed');
    var browserWindows = BrowserWindow.getAllWindows();
    browserWindows.forEach(function(browserWindow) {
        browserWindow.removeAllListeners('close');
    });
    setImmediate(() => { autoUpdater.quitAndInstall(); })
}

function startDownload() {
    progressBar = new ProgressBar({
        indeterminate: false,
        text: 'Downloading update...',
        detail: 'Downloading...',
        title: 'Blink Auto Updater',
        browserWindow: {
            backgroundColor: '#eee'
        },
        style: {
            bar: {
                'height': '10px',
                'box-shadow': 'none',
                'border-radius': '2px'
            }
        }
    });

    autoUpdater.downloadUpdate();
}

function checkForUpdates(menuItem, focusedWindow, event) {
    updater = menuItem;
    updater.enabled = false;
    autoUpdater.checkForUpdates();
}

function startUpdateTimer() {
    setInterval(() => {
        autoUpdater.checkForUpdates();
    }, 43200000);
    setTimeout(() => {
        autoUpdater.checkForUpdates();
    }, 10000);
}

function createUpdateDialog(info) {
    if (updateWindow == null) {
        updateWindow = true;
        dialog.showMessageBox({
            type: 'info',
            title: 'Software Update',
            message: 'A new version of Blink is available!',
            detail: `Blink ${info.version} is now available\u2014you have ${autoUpdater.currentVersion}. Would you like to download it now?`,
            buttons: ['Yes', 'Remind me Later']
        }).then(({ response, checkboxChecked }) => {
            if (response === 0) {
                startDownload();
            } else {
                if (updater != null) {
                    updater.enabled = true;
                    updater = null;
                }
            }
            updateWindow = null;
        });
    }
}

function createMainWindow() {
    // Options for BrowserWindow
    const windowOptions = {
        width: 1067,
        height: 600,
        minWidth: 1067,
        minHeight: 600,
        title: 'Blink',
        backgroundColor: '#333',
        autoHideMenuBar: true,
        webPreferences: {
            nodeIntegration: true,
            enableRemoteModule: true,
            contextIsolation: false,
        }
    };
    if (isDarwin) {
        //windowOptions.titleBarStyle = 'hidden-inset';
        windowOptions.frame = false;
    } else if (isLinux) {
        windowOptions.icon = `${__dirname}/www/assets/images/blink-48.png`;
    }

    // Create the browser window.
    mainWindow = new BrowserWindow(windowOptions);

    // and load the index.html of the app.
    mainWindow.loadURL(`file://${__dirname}/www/index.html`);

    // custom titlebar on OSX
    if (isDarwin) {
        mainWindow.webContents.on('did-finish-load', function() {
            const osxTitleBar = fs.readFileSync(`${__dirname}/osxTitleBar.js`).toString('utf-8');
            mainWindow.webContents.executeJavaScript(osxTitleBar);
        });
        ipc.on('close', function() {
            mainWindow.close();
        });
        ipc.on('update-badge', function(event, num) {
            const dock = electron.app.dock;
            if (num === null || num === 0) {
                dock.setBadge('');
            } else {
                dock.setBadge('' + num);
            }
        });
    } else if (!isLinux) {
        const badgeOptions = {};
        new Badge(mainWindow, badgeOptions);
    }

    ipc.on('minimize', function() {
        mainWindow.minimize();
    });

    ipc.on('buttonClick', function(event, arg) {
        mainWindow.webContents.send('buttonClick', arg);
    });

    ipc.on('getStorage', () => {
        mainWindow.webContents.send('storagePath', storage.getDataPath('userData'));
    });

    ipc.on('pointer-overlay', function(event, p) {
        try { showPointerOverlay(p); } catch (e) { /* noop */ }
    });

    ipc.handle('cache:saveFile', async (event, { id, data, filetype }) => {
        const cacheDir = path.join(storage.getDataPath('userData'), 'mediaCache');
        await fs.promises.mkdir(cacheDir, { recursive: true });
        const filePath = path.join(cacheDir, id);
        const buffer = Buffer.from(data.split(',')[1], 'base64');
        await fs.promises.writeFile(filePath, buffer);
        return filePath;
    });

    ipc.handle('cache:getFile', async (event, { id }) => {
        const filePath = path.join(storage.getDataPath('userData'), 'mediaCache', id);
        try {
            await fs.promises.access(filePath);
            return filePath;
        } catch {
            return null;
        }
    });

    ipc.handle('cache:removeFile', async (event, { id }) => {
        const filePath = path.join(storage.getDataPath('userData'), 'mediaCache', id);
        await fs.promises.unlink(filePath).catch(() => {});
    });

    // open links with default browser
    mainWindow.webContents.on('new-window', function(event, url) {
        event.preventDefault();
        shell.openExternal(url);
    });

    // prevent title update
    mainWindow.on('page-title-updated', function(event) {
        event.preventDefault();
    });

    // Emitted when the window is about to be closed
    mainWindow.on('close', (event) => {
        if (!quitting) {
            event.preventDefault();
            if (isDarwin) {
                app.hide();
            } else {
                mainWindow.hide();
            }
        }
    });

    // Emitted when the window is closed.
    mainWindow.on('closed', () => {
        mainWindow = null;
    });
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', function() {
    Menu.setApplicationMenu(appMenu);
    createMainWindow();
    startUpdateTimer();
});

// Quit when all windows are closed.
app.on('window-all-closed', () => {
    // On OS X it is common for applications and their menu bar
    // to stay active until the user quits explicitly with Cmd + Q
    if (!isDarwin) {
        app.quit();
    }
});

app.on('activate', () => {
    // On OS X it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (mainWindow === null) {
        createMainWindow();
    }
    mainWindow.show();
});

app.on('before-quit', () => {
    quitting = true;
    destroyPointerOverlays();
});

