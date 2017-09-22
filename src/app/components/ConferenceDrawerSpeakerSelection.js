'use strict';

const React             = require('react');
const PropTypes         = require('prop-types');
const ReactBootstrap    = require('react-bootstrap');
const MenuItem          = ReactBootstrap.MenuItem;
const DropdownButton    = ReactBootstrap.DropdownButton;


class ConferenceDrawerSpeakerSelection extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            speakers: props.activeSpeakers.map((participant) => {return participant.id})
        };

        // ES6 classes no longer autobind
        [
            'handleFirstSpeakerSelected',
            'handleSecondSpeakerSelected'
        ].forEach((name) => {
            this[name] = this[name].bind(this);
        });
    }

    componentWillReceiveProps(nextProps) {
        let speakers = [];
        if (nextProps.activeSpeakers.length !== 0) {
            speakers = nextProps.activeSpeakers.map((participant) => {
                return participant.id
            });
        }
        this.setState({speakers: speakers});
    }

    handleFirstSpeakerSelected(event) {
        if (event === 'none') {
            if (this.state.speakers.length > 0) {
                this.props.selected({ id: event});
                const newSpeakers = this.state.speakers.slice(1);
                this.setState({speakers: newSpeakers})
            }
        } else {
            if (this.state.speakers[0] !== this.props.participants[event].id) {
                this.props.selected(this.props.participants[event]);
                const newSpeakers = this.state.speakers.slice();
                newSpeakers[0] = this.props.participants[event].id;
                this.setState({speakers: newSpeakers})
            }
        }
    }

    handleSecondSpeakerSelected(event) {
        if (event === 'none') {
            if (this.state.speakers.length > 1) {
                this.props.selected({ id: event}, true);
                const newSpeakers = this.state.speakers.slice();
                newSpeakers.pop();
                this.setState({speakers: newSpeakers})
            }
        } else {
            const newSpeakers = this.state.speakers.slice();
            newSpeakers[1] = this.props.participants[event].id;
            this.setState({speakers: newSpeakers})
            this.props.selected(this.props.participants[event], true);
        }
    }

    render() {
        const participantsLeft = [];
        const participantsRight = [];
        let title1 = 'None';
        let title2 = 'None';

        participantsLeft.push(<MenuItem key="divider" divider />);

        this.props.participants.forEach((p, index) => {
            if (this.state.speakers[0] === p.id) {
                participantsLeft.push(
                    <MenuItem key={index} eventKey={index} active={true}>
                        {p.identity.displayName || p.identity.uri}
                    </MenuItem>
                );
                title1 = p.identity.displayName || p.identity.uri;
            } else if (this.state.speakers[1] === p.id) {
                participantsRight.push(
                    <MenuItem key={index} eventKey={index} active={true}>
                        {p.identity.displayName || p.identity.uri}
                    </MenuItem>
                );
                title2 = p.identity.displayName || p.identity.uri;
            } else {
                participantsRight.push(
                    <MenuItem key={index} eventKey={index}>
                        {p.identity.displayName || p.identity.uri}
                    </MenuItem>
                );
                participantsLeft.push(
                    <MenuItem key={index} eventKey={index}>
                        {p.identity.displayName || p.identity.uri}
                    </MenuItem>
                );
            }
        });

        if (participantsRight.length !== 0) {
            participantsRight.unshift(<MenuItem key="divider" divider />);
        }

        return (
            <div>
                <h4 className="header">Active Speakers</h4>
                <div className="form-group">
                   <label htmlFor="speaker1" className="control-label">Speaker 1:</label>
                   <DropdownButton id="speaker1" title={title1} onSelect={this.handleFirstSpeakerSelected} block>
                       <MenuItem key="none" eventKey="none" active={this.state.speakers.length === 0}>None</MenuItem>
                       {participantsLeft}
                   </DropdownButton>
                </div>
                <div className="form-group">
                    <label htmlFor="speaker1">Speaker 2:</label>
                    <DropdownButton onSelect={this.handleSecondSpeakerSelected} id="speaker2" title={title2} disabled={this.props.participants.length < 2 || this.state.speakers.length === 0} block>
                        <MenuItem key="none" eventKey="none" active={this.state.speakers.length < 2}>None</MenuItem>
                        {participantsRight}
                    </DropdownButton>
                </div>
            </div>
        );
    }
}

ConferenceDrawerSpeakerSelection.propTypes = {
    participants: PropTypes.array.isRequired,
    selected: PropTypes.func,
    activeSpeakers: PropTypes.array
};


module.exports = ConferenceDrawerSpeakerSelection;
