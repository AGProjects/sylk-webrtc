'use strict';

const React = require('react');
const PropTypes  = require('prop-types');
const { default: clsx } = require('clsx');

const LoadingScreen = (props) => {
    const textDisplayClasses = clsx({
        'hidden': props.text.length === 0
    });

    return (
        <div>
            <div className="modal-backdrop semi-transparent"></div>
            <div className="modal" style={{display: 'block'}}>
                <div className="loading">
                    <div className="loading-inner">
                        <i className="fa fa-4x fa-spin fa-cog" /><br />
                        <h1 className={textDisplayClasses}>{props.text}</h1>
                    </div>
                </div>
            </div>
        </div>
    );
}
LoadingScreen.propTypes = {
    text: PropTypes.string
};

module.exports = LoadingScreen;
