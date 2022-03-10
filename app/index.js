
const electron = require('electron');
const Notification = electron.Notification
const fs = require('fs');
const openAboutWindow = require('about-window').default;
const Badge = require('electron-windows-badge');

const app = electron.app;
const BrowserWindow = electron.BrowserWindow;
const dialog = electron.dialog;
const Menu = electron.Menu;
const ipc = electron.ipcMain;
const shell = electron.shell;

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
    progressBar.detail =  `Downloading...  ${(progressObj.bytesPerSecond / 1000).toFixed(2)} KB/s (${(progressObj.transferred / 1000000).toFixed(2)} MB / ${(progressObj.total / 1000000).toFixed(2)} MB)`;
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
    label: 'Sylk',
    submenu: [
        { label: 'Check for updates...', click: (item, win, event) => { checkForUpdates(item, win, event); }},
        { label: 'About', click: () => { openAboutWindow(Object.assign({}, aboutOptions)); }},
        { label: 'Quit', accelerator: 'Command+Q', click: () => { app.quit(); }}
    ]}, {
    label: 'Edit',
    submenu: [
        { label: 'Undo', accelerator: 'CmdOrCtrl+Z', selector: 'undo:' },
        { label: 'Redo', accelerator: 'Shift+CmdOrCtrl+Z', selector: 'redo:' },
        { type: 'separator' },
        { label: 'Cut', accelerator: 'CmdOrCtrl+X', selector: 'cut:' },
        { label: 'Copy', accelerator: 'CmdOrCtrl+C', selector: 'copy:' },
        { label: 'Paste', accelerator: 'CmdOrCtrl+V', selector: 'paste:' },
        { label: 'Select All', accelerator: 'CmdOrCtrl+A', selector: 'selectAll:' }
    ]}, {
    label: 'Debug',
    submenu: [
        { label: 'Open DevTools', click: () => { mainWindow.webContents.openDevTools({mode: 'detach'}); } }
    ]}
]);

function ensureSafeQuitAndInstall() {
    app.removeAllListeners('window-all-closed');
    var browserWindows = BrowserWindow.getAllWindows();
    browserWindows.forEach(function(browserWindow) {
        browserWindow.removeAllListeners('close');
    });
    setImmediate(() => {autoUpdater.quitAndInstall();})
}

function startDownload() {
    progressBar = new ProgressBar({
        indeterminate: false,
        text: 'Downloading update...',
        detail: 'Downloading...',
        title: 'Sylk Auto Updater',
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
    }, 5000);
}

function createUpdateDialog(info) {
    if (updateWindow == null) {
        updateWindow = true;
        dialog.showMessageBox({
            type: 'info',
            title: 'Software Update',
            message: 'A new version of Sylk is available!',
            detail: `Sylk ${info.version} is now available\u2014you have ${autoUpdater.currentVersion}. Would you like to download it now?`,
            buttons: ['Yes', 'Remind me Later']
        }).then(({response, checkboxChecked}) => {
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
        title: 'Sylk',
        backgroundColor: '#333',
        webPreferences: {
            nodeIntegration: true
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
        ipc.on('minimize', function() {
            mainWindow.minimize();
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

    ipc.on('buttonClick', function(event, arg) {
        mainWindow.webContents.send('buttonClick',arg);
    });

    ipc.on('getStorage', () => {
        mainWindow.webContents.send('storagePath', storage.getDataPath('userData'));
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
});

