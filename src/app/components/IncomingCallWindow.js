'use strict';
const React = require('react');
const ReactDOM = require('react-dom');
const PropTypes = require('prop-types');


class IncomingCallWindow extends React.Component {
    constructor(props) {
        super(props);

        this.ipcRenderer = window.require('electron').ipcRenderer;
        this.el = document.createElement('div');

        [
            'buttonClick',
            'answer',
            'answerAudioOnly',
            'sendContent'
        ].forEach((name) => {
            this[name] = this[name].bind(this);
        });
    }

    componentDidMount() {
        const fs = window.require('fs');

        this.ipcRenderer.on('buttonClick', this.buttonClick);
        this.ipcRenderer.on('incomingCall:ready', this.sendContent);

        this.ipcRenderer.send('incomingCall:create', {
            url: `file://${window.__dirname}/incomingWindow.html`,
            script: fs.readFileSync(`${window.__dirname}/../incomingWindow.js`).toString('utf-8'),
            enabled: !!this.props.enabled
        });
    }

    sendContent() {
        this.ipcRenderer.send('incomingCall:content', {
            html: this.el.innerHTML,
            styles: this.collectStyles(document)
        });
    }

    componentDidUpdate(prevProps) {
        if (this.props.enabled !== prevProps.enabled) {
            this.ipcRenderer.send('incomingCall:setVisible', !!this.props.enabled);
        }
    }

    componentWillUnmount() {
        this.ipcRenderer.send('incomingCall:close');
        this.ipcRenderer.removeListener('buttonClick', this.buttonClick);
        this.ipcRenderer.removeListener('incomingCall:ready', this.sendContent);
    }

    collectStyles(sourceDoc) {
        return Array.from(sourceDoc.styleSheets)
            .filter((styleSheet) => !styleSheet.href && styleSheet.cssRules)
            .map((styleSheet) => Array.from(styleSheet.cssRules).map((rule) => rule.cssText).join(''));
    }

    buttonClick(event, store) {
        if (store === 'audio') {
            this.answerAudioOnly();
        } else if (store === 'accept') {
            this.answer();
        } else {
            this.props.setFocus(false);
            this.props.onHangup();
            this.ipcRenderer.send('window:blur');
        }
    }

    answerAudioOnly() {
        this.props.onAnswer({ audio: true, video: false });
    }

    answer() {
        this.props.onAnswer({ audio: true, video: true });
    };

    render() {
        return ReactDOM.render(this.props.children, this.el);
    }
}

IncomingCallWindow.propTypes = {
    onAnswer: PropTypes.func.isRequired,
    onHangup: PropTypes.func.isRequired,
    setFocus: PropTypes.func.isRequired,
    enabled: PropTypes.bool,
    children: PropTypes.node
};

module.exports = IncomingCallWindow;
