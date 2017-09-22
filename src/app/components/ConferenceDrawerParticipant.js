'use strict';

const React             = require('react');
const PropTypes         = require('prop-types');
const ReactBootstrap    = require('react-bootstrap');
const Label             = ReactBootstrap.Label;
const Media             = ReactBootstrap.Media;
const ButtonGroup       = ReactBootstrap.ButtonGroup;

const UserIcon  = require('./UserIcon');


const ConferenceDrawerParticipant = (props) => {
    let tag = ''
    if (props.isLocal) {
        tag = <Label bsStyle="primary">Myself</Label>;
    }

    return (
        <Media className="text-left">
            <Media.Left>
                <UserIcon identity={props.participant.identity} />
            </Media.Left>
            <Media.Body className="vertical-center">
                <Media.Heading>{props.participant.identity.displayName || props.participant.identity.uri}</Media.Heading>
            </Media.Body>
            <Media.Right className="vertical-center">
                {tag}
            </Media.Right>
        </Media>
    );

}

ConferenceDrawerParticipant.propTypes = {
    participant: PropTypes.object.isRequired,
    isLocal: PropTypes.bool
};


module.exports = ConferenceDrawerParticipant;
