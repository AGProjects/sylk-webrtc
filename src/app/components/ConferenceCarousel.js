'use strict';

const React = require('react');


class ConferenceCarousel extends React.Component {
    render() {
        return (
            <div className="carousel">
                <ul className="carousel-list list-inline">
                {
                    React.Children.map(this.props.children, (child, index) => {
                        return <li key={index} className="carousel-item">{child}</li>
                    })
                }
                </ul>
            </div>
        );
    }
}

ConferenceCarousel.propTypes = {
    children: React.PropTypes.node
};


module.exports = ConferenceCarousel;
