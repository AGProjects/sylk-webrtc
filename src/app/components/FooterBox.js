'use strict';

const React          = require('react');


let FooterBox = React.createClass({
    render: function() {
        return (
            <div className="cover-container">
                <div className="footer">
                    <div className="inner-small">
                        <p>Copyright &copy; 2015 <a href="http://ag-projects.com">AG Projects</a></p>
                    </div>
                </div>
            </div>
        );
    }
});

module.exports = FooterBox;
