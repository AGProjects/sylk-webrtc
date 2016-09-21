'use strict';

const React                   = require('react');
const ReactCSSTransitionGroup = require('react-addons-css-transition-group');


class ConferenceCarousel extends React.Component {
    render() {
        const items = [];
        let idx = 0;
        React.Children.forEach(this.props.children, (child) => {
            items.push(<li key={idx} className="carousel-item">{child}</li>);
            idx++;
        });

        return (
            <div className="carousel">
                    <ReactCSSTransitionGroup component="ul" className="carousel-list list-inline" transitionName="carousel" transitionEnterTimeout={500} transitionLeaveTimeout={300}>
                        {items}
                    </ReactCSSTransitionGroup>
            </div>
        );
    }
}

ConferenceCarousel.propTypes = {
    children: React.PropTypes.node
};


module.exports = ConferenceCarousel;
