'use strict';

const React = require('react');


const URIInput = (props) => {
    return (
        <div className="form-group">
            <input type="text" list="historyList" className="form-control input-lg"
                onChange={props.onChange}
                value={props.value}
                autoCapitalize="off"
                autoCorrect="off"
                required
                autoFocus={props.autoFocus}
            />
            <datalist id="historyList">
            {
                props.data.map((item, idx) => {
                    return <option key={idx} value={item}>{item}</option>;
                })
            }
            </datalist>
        </div>
    );
}

URIInput.propTypes = {
    value: React.PropTypes.string.isRequired,
    data: React.PropTypes.array.isRequired,
    autoFocus: React.PropTypes.bool.isRequired,
    onChange: React.PropTypes.func.isRequired
};


module.exports = URIInput;
