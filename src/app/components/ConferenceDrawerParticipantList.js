'use strict';

const React             = require('react');
const PropTypes         = require('prop-types');
const ReactBootstrap    = require('react-bootstrap');
const ListGroup         = ReactBootstrap.ListGroup;
const ListGroupItem     = ReactBootstrap.ListGroupItem;


const ConferenceDrawerParticipantList = (props) => {
    const items = [];
    let idx = 0;
    React.Children.forEach(props.children, (child) => {
        items.push(<ListGroupItem key={idx}>{child}</ListGroupItem>);
        idx++;
    });

    return (
        <div>
            <h4 className="header">Participants</h4>
            <ListGroup>
                {items}
            </ListGroup>
        </div>
    );
};

ConferenceDrawerParticipantList.propTypes = {
    children: PropTypes.node
};


module.exports = ConferenceDrawerParticipantList;
