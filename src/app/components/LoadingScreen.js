'use strict';

const React = require('react');


let LoadingScreen = React.createClass({
    render: function() {
        return (
            <div>
                <div className="modal-backdrop semi"></div>
                <div className="modal" style={{display: 'block'}}>
                    <div className="loading">
                        <div className="loading-inner">
                            <i className="fa fa-4x fa-spin fa-cog" />
                        </div>
                    </div>
                </div>
            </div>
        );
    }
});

module.exports = LoadingScreen;
