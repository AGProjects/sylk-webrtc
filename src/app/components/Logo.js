'use strict';

const React = require('react');


let Logo = React.createClass({
    render: function() {
        return (
            <div>
                <div className="blink_logo"></div>
                <h1 className="cover-heading">Blink for Web</h1>
            </div>
        );
    }
});

module.exports = Logo;
