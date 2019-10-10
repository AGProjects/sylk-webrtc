'use strict';

const React      = require('react');
const PropTypes  = require('prop-types');


class DragAndDrop extends React.Component {
    state = {
        drag: false
    }

    dropRef = React.createRef()

    handleDrag = (e) => {
        e.preventDefault();
        e.stopPropagation();
    }

    handleDragIn = (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.dragCounter++
        if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
            this.setState({drag: true});
        }
    }

    handleDragOut = (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.dragCounter--
        if (this.dragCounter === 0) {
            this.setState({drag: false});
        }
    }

    handleDrop = (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.setState({drag: false});
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            this.props.handleDrop(e.dataTransfer.files);
            e.dataTransfer.clearData();
            this.dragCounter = 0;
        }
    }

    componentDidMount() {
        let div = this.dropRef.current;
        div.addEventListener('dragenter', this.handleDragIn);
        div.addEventListener('dragleave', this.handleDragOut);
        div.addEventListener('dragover', this.handleDrag);
        div.addEventListener('drop', this.handleDrop);
    }

    componentWillUnmount() {
        let div = this.dropRef.current
        div.removeEventListener('dragenter', this.handleDragIn);
        div.removeEventListener('dragleave', this.handleDragOut);
        div.removeEventListener('dragover', this.handleDrag);
        div.removeEventListener('drop', this.handleDrop);
    }

    render() {
        return (
        <div
            ref={this.dropRef}
        >
            {this.state.drag &&
            <div 
                style={{
                    border: 'dashed grey 3px',
                    backgroundColor: 'rgba(255,255,255,.8)',
                    position: 'absolute',
                    top: 0,
                    bottom: 0,
                    left: 0, 
                    right: 0,
                    zIndex: 9999
                }}
            >
                <div 
                    style={{
                        position: 'absolute',
                        top: '50%',
                        right: 0,
                        left: 0,
                        textAlign: 'center',
                        color: 'grey',
                        fontSize: 36
                    }}
                >
                    <div>Drop files to share them to the conference</div>
                </div>
            </div>
        }
        {this.props.children}
        </div>
        )
    }
}

DragAndDrop.propTypes = {
    handleDrop: PropTypes.func.isRequired,
    children: PropTypes.node
};


module.exports = DragAndDrop