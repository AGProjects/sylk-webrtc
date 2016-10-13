
const electron = require('electron');
const fs = require('fs');
const openAboutWindow = require('about-window').default;

const app = electron.app;
const BrowserWindow = electron.BrowserWindow;
const Menu = electron.Menu;
const ipc = electron.ipcMain;
const shell = electron.shell;


// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let mainWindow;


// for platform specific tricks
const isDarwin = process.platform === 'darwin';
const isLinux = process.platform === 'linux';


// Flag indicating if we are about to quit
let quitting = false;


// options for about window
const aboutOptions = {
    icon_path: `${__dirname}/www/assets/images/blink.ico`,
    copyright: 'Copyright (c) AG Projects',
    homepage: 'http://sylkserver.com'
};


// Application menu
const appMenu = Menu.buildFromTemplate([{
    label: 'Sylk',
    submenu: [
        { label: 'About', click: () => { openAboutWindow(aboutOptions); }},
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


function createMainWindow() {
    // Options for BrowserWindow
    const windowOptions = {
        width: 860,
        height: 600,
        minWidth: 860,
        minHeight: 600,
        title: 'Sylk',
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
    }

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
