'use strict';

const React = require('react');


class URIInput extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            value: props.defaultValue,
            selecting: false
        };
        // ES6 classes no longer autobind
        this.onInputBlur = this.onInputBlur.bind(this);
        this.onInputChange = this.onInputChange.bind(this);
        this.onInputKeyDown = this.onInputKeyDown.bind(this);
    }

    componentWillReceiveProps(nextProps) {
        this.setState({
            value: nextProps.defaultValue
        });
    }

    onInputChange(event) {
        this.setState({value: event.target.value});
        this.props.onChange(event.target.value);
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
        this.setState({selecting: false});
    }

    render() {
        return (
            <div className="form-group">
                <input type="text" list="historyList" className="form-control input-lg"
                    onChange={this.onInputChange}
                    onKeyDown={this.onInputKeyDown}
                    onBlur={this.onInputBlur}
                    value={this.state.value}
                    autoCapitalize="off"
                    autoCorrect="off"
                    required
                    autoFocus={this.props.autoFocus}
                />
                <datalist id="historyList">
                {
                    this.props.data.map((item, idx) => {
                        return <option key={idx} value={item}>{item}</option>;
                    })
                }
                </datalist>
            </div>
        );

    }
}

URIInput.propTypes = {
    defaultValue: React.PropTypes.string.isRequired,
    data: React.PropTypes.array.isRequired,
    autoFocus: React.PropTypes.bool.isRequired,
    onChange: React.PropTypes.func.isRequired,
    onSelect: React.PropTypes.func.isRequired
};


module.exports = URIInput;
