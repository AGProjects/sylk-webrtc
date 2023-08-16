'use strict';

const React              = require('react');
const PropTypes          = require('prop-types');
const { default: TransitionGroup } = require('react-transition-group/TransitionGroup');
const { default: CSSTransition } = require('react-transition-group/CSSTransition');
const { default: clsx }  = require('clsx');

class ConferenceCarousel extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            displayLeftArrow: false,
            displayRightArrow: false
        };

        this.carouselList = null;

        // ES6 classes no longer autobind
        this.handleScroll = this.handleScroll.bind(this);
        this.handleResize = this.handleResize.bind(this);
        this.scrollToRight = this.scrollToRight.bind(this);
        this.scrollToLeft = this.scrollToLeft.bind(this);
    }

    componentDidMount() {
        // Get UL from children of the carousel
        const children = this.refs.carousel.children;
        for (let child of children) {
            if (child.tagName == 'UL') {
                this.carouselList = child;
            }
        };

        if (this.canScroll()) {
            this.setState({displayRightArrow: true});   // eslint-disable-line react/no-did-mount-set-state
        }

        window.addEventListener('resize', this.handleResize);
    }

    componentWillUnmount() {
        window.removeEventListener('resize', this.handleResize);
    }

    componentDidUpdate(prevProps) {
        if (prevProps.children.length != this.props.children.length) {
            // We need to wait for the animation to end before calculating
            setTimeout(() => {
                this.handleScroll();
            }, 310);
        }
    }

    canScroll() {
        return (this.carouselList.scrollWidth > this.carouselList.clientWidth);
    }

    handleScroll(event) {
        const newState = {
            displayRightArrow : false,
            displayLeftArrow  : false
        };

        if (this.canScroll()) {
            const scrollWidth = this.carouselList.scrollWidth;
            const scrollLeft = this.carouselList.scrollLeft;
            const clientWidth = this.carouselList.clientWidth;
            newState.displayRightArrow = true;
            if (scrollLeft > 0) {
                newState.displayLeftArrow = true;
                if (scrollLeft === (scrollWidth - clientWidth)) {
                    newState.displayRightArrow = false;
                }
            } else {
                newState.displayLeftArrow = false;
            }
        }

        this.setState(newState);
    }

    scrollToRight(event) {
        this.carouselList.scrollLeft += 100;
    }

    scrollToLeft(event) {
        this.carouselList.scrollLeft -= 100;
    }

    handleResize(event) {
        if (this.canScroll()) {
            this.setState({displayRightArrow: true})
        } else {
            if (this.state.displayRightArrow) {
                this.setState({displayRightArrow: false});
            }
        }
    }

    render() {
        const items = [];
        let idx = 0;
        React.Children.forEach(this.props.children, (child) => {
            items.push(<CSSTransition key={idx} classNames="carousel" timeout={{enter:500, exit:300}}><li className="carousel-item">{child}</li></CSSTransition>);
            idx++;
        });

        const arrows = [];
        if (this.state.displayLeftArrow) {
            arrows.push(<div className="left-arrow" onClick={this.scrollToLeft}><i className="fa fa-caret-left fa-4x"></i></div>);
        }
        if (this.state.displayRightArrow) {
            arrows.push(<div className="right-arrow" onClick={this.scrollToRight}><i className="fa fa-caret-right fa-4x"></i></div>);
        }
        const classes = clsx({
            'carousel-list' : true,
            'list-inline'   : true,
            'text-right'    : this.props.align === 'right'
        });
        return (
            <div>
                {arrows}
                <div className="carousel" ref="carousel">
                    <TransitionGroup component="ul" onScroll={this.handleScroll} className={classes}>
                        {items}
                    </TransitionGroup>
                </div>
            </div>
        );
    }
}

ConferenceCarousel.propTypes = {
    children: PropTypes.node,
    align: PropTypes.string
};


module.exports = ConferenceCarousel;
