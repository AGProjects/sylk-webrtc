'use strict';

const React                 = require('react');
const PropTypes             = require('prop-types');
const hark                  = require('hark');

const Styles        = require('material-ui/styles');
const withStyles    = Styles.withStyles;
const Colors        = require('material-ui/colors');
const Green         = Colors.green;
const Mui           = require('material-ui');
const Progress      = Mui.LinearProgress;


const styleSheet = {
    colorSecondary: {
        backgroundColor: Green[100]
    },
    barColorSecondary: {
        backgroundColor: Green[500]
    },
    root: {
        height: '10px',
        opacity: '0.7'
    },
    bar1Determinate: {
        transition: 'transform 0.2s linear'
    }
};

class VolumeBar extends React.Component {

  constructor(props) {
        super(props);
        this.speechEvents = null;
        this.state = {
            volume: 0
        }
    }

    componentDidMount() {
        const options = {
            interval: 225,
            play: false
        };
        this.speechEvents = hark(this.props.localMedia, options);
        this.speechEvents.on('volume_change', (vol, threshold) => {
            this.setState({volume: 2 * (vol + 75)});
        });
    }

    componentWillReceiveProps(nextProps) {
        if (nextProps.localMedia !== this.props.localMedia) {
            if (this.speechEvents !== null) {
                this.speechEvents.stop();
                this.speechEvents = null;
            }
            const options = {
                interval: 225,
                play: false
            };
            this.speechEvents = hark(nextProps.localMedia, options);
            this.speechEvents.on('volume_change', (vol, threshold) => {
                this.setState({volume: 2 * (vol + 75)});
            });
        }
    }

    componentWillUnmount() {
        if (this.speechEvents !== null) {
            this.speechEvents.stop();
            this.speechEvents = null;
        }
    }

    render() {
        let color = 'primary';
        if (this.state.volume > 20) {
            color = 'secondary';
        }
        return (
            <Progress classes={this.props.classes} variant="determinate" color={color} value={this.state.volume}></Progress>
        );
    }
}

VolumeBar.propTypes = {
    localMedia: PropTypes.object.isRequired,
    classes     : PropTypes.object.isRequired
};


module.exports = withStyles(styleSheet)(VolumeBar);
