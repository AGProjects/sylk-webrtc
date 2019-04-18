'use strict';
const React     = require('react');
const ReactDOM  = require('react-dom');
const PropTypes = require('prop-types');


class IncomingCallWindow extends React.Component {
    constructor(props) {
        super(props);

        this.width = 425;
        this.height = 475;
        this.ipcRenderer = null;
        const {BrowserWindow} = window.require('electron').remote;

        this.browserWindowObject = new BrowserWindow({
            show            : false,
            width           : this.width,
            height          : this.height,
            frame           : false,
            skipTaskBar     : true,
            title           : 'Incoming Call',
            alwaysOnTop     : true,
            backgroundColor : '#333',
            type            : 'toolbar'
        });
        this.el = document.createElement('div');

        [
            'copyStyles',
            'buttonClick',
            'answer',
            'answerAudioOnly'
        ].forEach((name) => {
            this[name] = this[name].bind(this);
        });
    }

    componentDidMount() {
        this.browserWindowObject.loadURL(`file://${window.__dirname}/incomingWindow.html`);

        this.browserWindowObject.once('ready-to-show', () => {
            if (this.props.enabled) {
                this.browserWindowObject.showInactive();
            }
        });

        this.browserWindowObject.webContents.once('dom-ready', () => {
            const fs = window.require('fs');
            const incomingWindow = fs.readFileSync(`${window.__dirname}/../incomingWindow.js`).toString('utf-8');
            this.browserWindowObject.webContents.executeJavaScript(incomingWindow)
            .then(() => {
                this.browserWindowObject.webContents.send('updateContent', this.el.innerHTML);
                this.copyStyles(document);
            });
        });

        this.ipcRenderer = window.require('electron').ipcRenderer;
        this.ipcRenderer.on('buttonClick', this.buttonClick);
    }

    componentDidUpdate(prevProps) {
        if (this.props.enabled !== prevProps.enabled) {
            if (this.props.enabled) {
                this.browserWindowObject.showInactive();
            } else {
                this.browserWindowObject.hide();
            }
        }
    }

    componentWillUnmount() {
        this.browserWindowObject.close();
        if (this.ipcRenderer != null) {
            this.ipcRenderer.removeListener('buttonClick', this.buttonClick)
        }
    }

    copyStyles(sourceDoc) {
        Array.from(sourceDoc.styleSheets).forEach(styleSheet => {
            if (!styleSheet.href && styleSheet.cssRules) {
                const newStyleEl = sourceDoc.createElement('style');
                Array.from(styleSheet.cssRules).forEach(cssRule => {
                    newStyleEl.appendChild(sourceDoc.createTextNode(cssRule.cssText));
                });
                this.browserWindowObject.webContents.send('updateStyles', newStyleEl.innerHTML);
            }
        });
    }

    buttonClick(event, store) {
        if (store === 'audio') {
            this.answerAudioOnly();
        } else if (store === 'accept') {
            this.answer();
        } else {
            this.props.setFocus(false);
            this.props.onHangup();
            window.require('electron').remote.getCurrentWindow().blur();
        }
    }

    answerAudioOnly() {
        this.props.onAnswer({audio: true, video: false});
    }

    answer() {
        this.props.onAnswer({audio: true, video: true});
    };

    render() {
        return this.browserWindowObject ? ReactDOM.render(this.props.children, this.el) : null;
    }
}

IncomingCallWindow.propTypes = {
    onAnswer : PropTypes.func.isRequired,
    onHangup : PropTypes.func.isRequired,
    setFocus : PropTypes.func.isRequired,
    enabled  : PropTypes.bool,
    children : PropTypes.node
};

module.exports = IncomingCallWindow;
