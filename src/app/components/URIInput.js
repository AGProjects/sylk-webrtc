'use strict';

const React        = require('react');
const PropTypes    = require('prop-types');
const autocomplete = require('autocomplete.js');


class URIInput extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            selecting: false
        };

        this.uriInput = React.createRef();

        // ES6 classes no longer autobind
        this.onInputBlur = this.onInputBlur.bind(this);
        this.onInputChange = this.onInputChange.bind(this);
        this.onInputKeyDown = this.onInputKeyDown.bind(this);
        this.onInputClick = this.onInputClick.bind(this);
        this.clicked = false;
        this.autoComplete;
    }

    componentDidMount() {
        this.autoComplete = autocomplete('#uri-input', { hint: false }, [
            {
                source: (query, cb) => {
                    const lowerQuery = query.toLowerCase();
                    const resultsMap = new Map(); // key = uri
                    this.props.data.forEach(item => {
                        if (typeof item === 'string') {
                            if (item.toLowerCase().startsWith(lowerQuery)) {
                                resultsMap.set(item, {
                                    original: item,
                                    matchedUri: item
                                });
                            }
                            return;
                        }

                        const name = item?.name ?? '';
                        const uris = item?.uris ?? [];

                        for (let uriObj of uris) {
                            const uri = uriObj?.uri;
                            if (uri?.toLowerCase().startsWith(lowerQuery)) {
                                resultsMap.set(uri, {
                                    original: item,
                                    matchedUri: uri
                                });
                            }
                        }
                        const lowerName = name?.toLowerCase() ?? '';
                        const lowerDefaultUri = item?.defaultUri?.uri?.toLowerCase() ?? '';

                        if (
                            lowerName.includes(lowerQuery) &&
                                lowerName !== lowerDefaultUri
                        ) {
                            for (let uriObj of uris) {
                                const uri = uriObj?.uri;
                                if (uri) {
                                    resultsMap.set(uri, {
                                        original: item,
                                        matchedUri: uri
                                    });
                                }
                            }
                        }
                    });

                    cb(Array.from(resultsMap.values()).slice(0,10));
                },

                displayKey: (item) => {
                    return item.matchedUri;
                },

                templates: {
                    suggestion: (item) => {
                        if (typeof item.original === 'string') {
                            return `<span class="uri">${item.original}</span>`;
                        }

                        const uri = item.matchedUri;
                        const name = item.original?.name ?? '';
                        if (name === uri) {
                          return `<span class="uri">${uri}</span>`;
                        }
                        return `<span class="uri">${uri}</span><span class="name">${name ? ` (${name})` : ''}</span>`;
                    }
                }
            }
        ])
        .on('autocomplete:selected', (event, suggestion) => {
            this.setValue(suggestion.matchedUri);
        });

        if (this.props.autoFocus) {
            this.uriInput.current.focus();
        }
    }

    componentDidUpdate(prevProps) {
        if (prevProps.defaultValue !== this.props.defaultValue && this.props.autoFocus) {
            this.uriInput.current.focus();
        }
    }

    setValue(value) {
        this.props.onChange(value);
    }

    onInputChange(event) {
        this.setValue(event.target.value);
    }

    onInputClick(event) {
        if (!this.clicked) {
            this.uriInput.current.select();
            this.clicked = true;
        }
    }

    onInputKeyDown(event) {
        switch (event.which) {
            case 13:
                // ENTER
                if (this.state.selecting) {
                    this.setState({selecting: false});
                } else {
                    this.props.onSelect(event.target.value);
                }
                break;
            case 27:
                // ESC
                this.setState({selecting: false});
                break;
            case 38:
            case 40:
                // UP / DOWN ARROW
                this.setState({selecting: true});
                break;
            default:
                break;
        }
    }

    onInputBlur(event) {
        // focus was lost, reset selecting state
        if (this.state.selecting) {
            this.setState({selecting: false});
        }
        this.clicked = false;
    }

    render() {
        return (
            <div className="form-group uri-input">
                <input type="text" id="uri-input" name="uri-input" ref={this.uriInput} className="form-control input-lg"
                    onChange={this.onInputChange}
                    onKeyDown={this.onInputKeyDown}
                    onBlur={this.onInputBlur}
                    onClick={this.onInputClick}
                    value={this.props.defaultValue}
                    autoCapitalize="off"
                    autoCorrect="off"
                    required
                    autoFocus={this.props.autoFocus}
                    placeholder={this.props.placeholder}
                />
            </div>
        );

    }
}

URIInput.propTypes = {
    defaultValue: PropTypes.string.isRequired,
    data: PropTypes.array.isRequired,
    autoFocus: PropTypes.bool.isRequired,
    onChange: PropTypes.func.isRequired,
    onSelect: PropTypes.func.isRequired,
    placeholder : PropTypes.string
};


module.exports = URIInput;
