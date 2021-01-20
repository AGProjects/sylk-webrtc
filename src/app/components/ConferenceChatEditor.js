'use strict';

const React         = require('react');
const useEffect     = React.useEffect;
const useState      = React.useState;
const useRef        = React.useRef;
const PropTypes     = require('prop-types');
const debug         = require('debug');

const imageConversion   = require('image-conversion');
const data = require('emoji-mart/data/apple.json');
const Picker = require('emoji-mart/dist-modern/components/picker/nimble-picker').default;

const DEBUG = debug('blinkrtc:ConferenceChatEditor');

const computedStyleToInlineStyle = require('computed-style-to-inline-style');

const ConferenceChatEditor = (props) => {
    const [name, setName] = useState('');
    const [picker, setPicker] = useState(false);
    const [type, setType] = useState('text/plain');
    const [timer, setTimer] = useState(null);

    const editor = useRef(null);

    useEffect(() => {
        return () => clearTimeout(timer);
    }, [props.onSubmit, timer]);

    const togglePicker = () => {
        setPicker(!picker);
        props.scroll();
    }

    const handleInput = (e) => {
        DEBUG('Paste detected');
        let found = false;
        let target = e.currentTarget;

        e.clipboardData.types.forEach((type, i) => {
            if (type.match(/image.*/) || e.clipboardData.items[i].type.match(/image.*/)) {
                DEBUG('An image was pasted');
                const file = e.clipboardData.items[i].getAsFile();
                imageConversion.compressAccurately(file,{size: 200, scale: 0.5}).then(res => {
                    //The res in the promise is a compressed Blob type (which can be treated as a File type) file;
                    reader.readAsBinaryString(res);
                })
                const reader = new FileReader();
                reader.onload = (evt) => {
                    const binary = evt.target.result;
                    setName(binary);
                    setType(file.type);
                    const image = `data:${file.type};base64,${btoa(binary)}`
                    const imageTag = `<div class="file-box" onclick="window.getSelection().selectAllChildren(this)" style="background-image: url('${image}')" />${file.name}</div>`;
                    target.innerHTML = imageTag;
                    target.focus();
                };
                found = true;
            }
        });

        if (!found) {
            let data = e.clipboardData.getData('text/html');
            if (data === '') {
                DEBUG('No HTML data on clipboard');
            } else {
                DEBUG('HTML data on clipboard, content type will change');
                setType('text/html');
                const cleanData = data.replace(/\n|\t/g, '');
                if (target.innerHTML === '') {
                    e.preventDefault();
                    target.innerHTML = cleanData;
                } else {
                    e.preventDefault();
                    const selection = document.getSelection();
                    selection.deleteFromDocument();
                    const div = document.createElement('template');
                    div.innerHTML = cleanData;
                    selection.getRangeAt(0).insertNode(div.content.cloneNode(true));
                }
                computedStyleToInlineStyle(target, {
                    recursive: true,
                    properties: [
                        'font-family',
                        'font-size',
                        'margin',
                        'color',
                        'background-color'
                    ]
                });
            }
            setTimeout(()=> {
                setName(`${target.innerHTML}`);
                editor.current.blur();
                editor.current.focus();
            }, 50);
        }
    }

    const onKeyDown = (event) => {
        let target = event.currentTarget;
        switch (event.which) {
            case 8:
                // Backspace in case of image, delete all
                if (type.startsWith('image/')) {
                    event.preventDefault();
                    setName('');
                    setType('text/plain');
                    while (target.firstChild) target.removeChild(target.firstChild);
                } else {
                    setName(target.innerText);
                }
                break;
            case 27:
                // ESC
                DEBUG('Esc pressed, clear inputi or close emoji');
                if (picker) {
                    setPicker(false);
                } else {
                    setType('text/plain');
                    while (target.firstChild) target.removeChild(target.firstChild);
                    setName('');
                }
                break;
            case 13:
                // Enter
                DEBUG('ENTER pressed');
                if (!event.shiftKey) {
                    event.preventDefault();
                    event.stopPropagation();
                    if (timer !== null) {
                        clearTimeout(timer);
                    }
                    if (name !== '' && name !== '\n') {
                        if (type === 'text/html') {
                            DEBUG('Sending HTML content');
                            props.onSubmit(name, type);
                        } else if (type.startsWith('image/')) {
                            DEBUG('Sending image');
                            props.onSubmit(name, type)
                        } else {
                            DEBUG('Sending text content');
                            props.onSubmit(name)
                        }
                    } else {
                        break;
                    }
                    if (picker) {
                        setPicker(false);
                    }
                    setType('text/plain');
                    while (target.firstChild) target.removeChild(target.firstChild);
                    setName('');
                }
                break;
            case 91:
                break;
            default:
                if (!(event.ctrlKey || event.which === 224)) {
                    setTimeout(() => {
                        if (target.innerHTML === '<br>') {
                            DEBUG('Editor is empty');
                            while (target.firstChild) target.removeChild(target.firstChild);
                            if (timer !== null) {
                                DEBUG('__reset__');
                                clearTimeout(timer);
                                setTimer(null);
                                props.onTyping('idle');
                            }
                        } else if (timer === null) {
                            setTimer(
                                setTimeout(() => {
                                    DEBUG('__idle__');
                                    props.onTyping('idle');
                                    setTimer(null);
                                }, 10000)
                            );
                            DEBUG('__composing__');
                            props.onTyping('active');
                        }
                        if (type === 'text/html') {
                            setName(target.innerHTML);
                        } else {
                            setName(target.innerText);
                        }
                    }, 5);
                }
                break;
        }
    };

    const addEmoji = (emoji) => {
        editor.current.innerText = editor.current.innerText + `${emoji.native}`;
        setName(editor.current.innerText);
        editor.current.focus();
    }

    const moveCursorToEnd = (el) => {
        if(el.innerText && document.createRange && !type.startsWith('image/')) {
            window.setTimeout(() => {
                let selection = document.getSelection();
                let range = document.createRange();
                range.selectNodeContents(el);
                range.collapse(false);

                selection.removeAllRanges();
                selection.addRange(range);
            }, 1);
        }
    }

    return (
        <div style={{ margin: '0 -15px'}}>
            {picker ? <div style={{minHeight: '360px', flex: '0 0 auto', order: 2}} /> : '' }
            <div className="top-editor-wrapper">
                <div style={{position: 'absolute', top: 0, left: 0, width: '100%'}}>
                    <div style={{position: 'absolute', bottom: 0, left: 0, width: '100%'}}>
                        {picker ?
                            <Picker
                                set="apple"
                                data={data}
                                showPreview={false}
                                sheetSize={32}
                                showSkinTones={false}
                                onSelect={addEmoji}
                                style={{position: 'relative', width: '100%'}}
                                backgroundImageFn={() =>
                                        'assets/images/32.png'}
                            /> : ''}
                    </div>
                </div>
                <div className="emoji-button" onClick={togglePicker}>
                    <i className="fa fa-smile-o fa-2x" />
                </div>
                <div className="editor-wrapper">
                    <div className="editor-inner-wrapper">
                        <div className="pre-editor" style={{visibility: name.length !== 0 ? 'hidden' : 'visible'}}>
                            Type a message
                        </div>
                        <div className="editor"
                            contentEditable="true"
                            onPaste={handleInput}
                            onKeyDown={onKeyDown}
                            onFocus={(e) => {moveCursorToEnd(e.target); props.focus()}}
                            onBlur={() => props.focus()}
                            ref={editor}
                        ></div>
                    </div>
                </div>
            </div>
        </div>
    );
};

ConferenceChatEditor.propTypes = {
    onSubmit: PropTypes.func.isRequired,
    onTyping: PropTypes.func.isRequired,
    scroll: PropTypes.func.isRequired,
    focus: PropTypes.func.isRequired
};


module.exports = ConferenceChatEditor;
