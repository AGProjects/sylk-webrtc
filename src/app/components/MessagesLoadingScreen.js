'use strict';

const React     = require('react');
const PropTypes = require('prop-types');

const { LinearProgress } = require('@material-ui/core');


const MessagesLoadingScreen = (props) => {
    return (
        <div>
        <div className="modal-backdrop semi-transparent" style={{top: '50px'}}></div>
            <div className="modal" style={{display: 'block', top: '50px'}}>
                <div className="loading">
                    <div className="loading-inner">
                        <i className="fa fa-4x fa-spin fa-cog" /><br />
                        {props.progress !== 'storing'
                            ? <h1>Decrypting messages ...</h1>
                            : <h1>Processing messages ...</h1>
                        }
                        <div style={{maxWidth: '25%', margin: 'auto'}}>
                            <LinearProgress
                                style={{marginTop: '2px'}}
                                classes={{barColorPrimary: 'blue-bar'}}
                                variant={props.progress === 'storing' ? 'indeterminate' : 'determinate' }
                                value={isNaN(props.progress) ? 0 : props.progress}
                            />
                            <br />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

MessagesLoadingScreen.propTypes = {
    progress: PropTypes.any.isRequired
};


module.exports = MessagesLoadingScreen;
