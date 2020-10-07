'use strict';

const React             = require('react');
const useState          = React.useState;
const useEffect         = React.useEffect;
const PropTypes         = require('prop-types');
const ReactBootstrap    = require('react-bootstrap');
const Label             = ReactBootstrap.Label;
const Media             = ReactBootstrap.Media;
const ButtonGroup       = ReactBootstrap.ButtonGroup;
const hark              = require('hark');

const UserIcon  = require('./UserIcon');
const HandIcon  = require('./HandIcon');


const ConferenceDrawerParticipant = (props) => {
    let [active, setActive] = useState(false);
    let [speech, setSpeech] = useState(null);
    const streams = props.participant.streams;

    React.useEffect(() => {
        return () => {
            if (speech !== null) {
                speech.stop();
                setSpeech(null);
            }
        };
    },[speech]);

    if (speech === null && props.enableSpeakingIndication && streams.length > 0 && streams[0].getAudioTracks().length !== 0) {
        const options = {
            interval: 150,
            play: false
        };

        const speechEvents = hark(streams[0], options);
        speechEvents.on('speaking', () => {
            setActive(true);
        });
        speechEvents.on('stopped_speaking', () => {
            setActive(false);
        });
        setSpeech(speechEvents);
    }

    let tag = ''
    if (props.isLocal) {
        tag = <Label bsStyle="primary">Myself</Label>;
    }

    return (
        <Media className="text-left">
            <Media.Left>
                <UserIcon identity={props.participant.identity} active={active} small={true} />
            </Media.Left>
            <Media.Body className="vertical-center">
                <Media.Heading>{props.participant.identity.displayName || props.participant.identity.uri}</Media.Heading>
            </Media.Body>
            <Media.Right className="vertical-center">
                <HandIcon
                    raisedHand={props.raisedHand}
                    handleHandSelected={() => props.handleHandSelected(props.participant)}
                    disableHandToggle={props.disableHandToggle}
                    drawer
                />
                {tag}
            </Media.Right>
        </Media>
    );

}

ConferenceDrawerParticipant.propTypes = {
    participant: PropTypes.object.isRequired,
    raisedHand: PropTypes.number.isRequired,
    handleHandSelected: PropTypes.func.isRequired,
    disableHandToggle: PropTypes.bool,
    isLocal: PropTypes.bool,
    enableSpeakingIndication: PropTypes.bool
};


module.exports = ConferenceDrawerParticipant;
