'use strict';

const React         = require('react');
const PropTypes     = require('prop-types');
const utils         = require('../utils');

const ReactBootstrap    = require('react-bootstrap');
const ListGroup         = ReactBootstrap.ListGroup;
const ListGroupItem     = ReactBootstrap.ListGroupItem;


const ConferenceDrawerFiles = (props) => {
    const entries = props.sharedFiles.slice(0).reverse().map((elem, idx) => {
        const uploader = elem.uploader.displayName || elem.uploader.uri || elem.uploader;
        const color = utils.generateMaterialColor(elem.uploader.uri || elem.uploader)['300'];
        return (
            <ListGroupItem key={idx}>
                <div className="small">Shared by <span className="label label-info" style={{backgroundColor: color}}>{uploader}</span></div>
                <div className="file-link">
                    <a onClick={() => {props.downloadFile(elem.filename)}}>
                        <i className="fa fa-fw fa-file" />{elem.filename}
                    </a>
                    <span >({(elem.filesize / 1048576).toFixed(2)} MB)</span>
                </div>
            </ListGroupItem>
        );
    });

    return (
        <div className="drawer-files" style={props.embed ? {maxHeight: '50%'} : {}}>
            <h4 className="header">Shared Files</h4>
                <ListGroup style={props.wide ? {width: 450} : {}}>
                    {entries}
                </ListGroup>
        </div>
    );
};

ConferenceDrawerFiles.propTypes = {
    sharedFiles: PropTypes.array.isRequired,
    downloadFile: PropTypes.func.isRequired,
    embed: PropTypes.bool,
    wide: PropTypes.bool
};


module.exports = ConferenceDrawerFiles;
