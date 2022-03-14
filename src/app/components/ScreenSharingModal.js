'use strict';

const React          = require('react');
const useEffect      = React.useEffect;
const useState       = React.useState;
const PropTypes      = require('prop-types');

const ReactBootstrap = require('react-bootstrap');
const Modal          = ReactBootstrap.Modal;

const { makeStyles } = require('@material-ui/core/styles');
const {Tabs, Tab, GridList, GridListTile, GridListTileBar } = require('@material-ui/core');


const styleSheet = makeStyles({
    root: {
        display: 'flex',
        flexWrap: 'wrap',
        justifyContent: 'space-around',
        overflow: 'hidden'
    },
    gridList: {
        height: 300
    },
    fullWidth: {
        maxWidth: 'none'
    },
    border: {
        border: '2px solid #3f51b5',
        padding: '2px !important'
    }
});

const ScreenSharingModal = (props) => {
    const [value, setValue] = useState('screens');
    const [focus, setFocus] = useState(null);
    const [sources, setSources] = useState([]);
    const classes = styleSheet();

    useEffect(() => {
        let interval = null;
        if (props.show && sources.length !== 0) {
            interval = setTimeout(() => {
                getSources();
            }, 5000);
        }
        return (() => {
            if (interval !== null) {
                clearTimeout(interval);
            }
        });
    });

    const screens = sources.filter(source => source.display_id !== '' || source.id.lastIndexOf('screen', 0) === 0);
    const windows = sources.filter(source => source.display_id === '' && source.id.lastIndexOf('screen', 0) !== 0);

    const shareScreen = () => {
        props.getLocalScreen(focus);
    };

    const getSources = () => {
        const desktopCapturer = window.require('electron').desktopCapturer;
        desktopCapturer.getSources({ types: ['window', 'screen'], thumbnailSize: {width: 180, height: 180}})
        .then((newSources) => {
            if (sources.length === 0) {
                const firstScreen = newSources.filter(source => source.display_id !== '' || source.id.lastIndexOf('screen', 0) === 0)[0];
                setFocus(firstScreen.id);
            }
            setSources(newSources);
        });
    }

    const close = () => {
        setSources([]);
        setFocus(null);
        setValue('screens');
        props.close();
    }

    if (props.show && sources.length === 0) {
        getSources();
    }

    return (
        <Modal show={props.show} onHide={close}>
            <Modal.Header closeButton>
                <Modal.Title id="cmodal-title-sm">Share your screen</Modal.Title>
            </Modal.Header>
            <Modal.Body>
                Sylk wants to share the contents of your screen. Choose what you&#39;d like to share.
                <Tabs
                    value={value}
                    indicatorColor="primary"
                    textColor="primary"
                    onChange={(event, value) => { setValue(value)}}
                    variant="fullWidth"
                >
                    <Tab value="screens" classes={{ fullWidth: classes.fullWidth}} label="Your Entire Screen" />
                    <Tab value="windows" classes={{ fullWidth: classes.fullWidth}} label="Application Window" />
                </Tabs>
                <br />

                { sources.length === 0 &&
                    (
                        <div>
                            <i className="fa fa-4x fa-spin fa-cog" />
                            <p>Getting Your Screens and Windows</p>
                        </div>
                    )
                }

                { value === 'screens' && sources.length !== 0 &&
                    <GridList cellHeight={180} spacing={8} cols={2}  className={classes.gridList}>
                        {screens.map(screen => (
                            <GridListTile key={screen.id} onClick={() => setFocus(screen.id)} className={screen.id === focus && classes.border}>
                                <img src={screen.thumbnail.toDataURL()} alt={screen.name} />
                                <GridListTileBar
                                    title={screen.name}
                                />
                            </GridListTile>
                        ))}
                    </GridList>
                }

                { value === 'windows' && sources.length !== 0 &&
                    <GridList cellHeight={'auto'} spacing={8} cols={3} className={classes.gridList}>
                        {windows.map(screen => (
                            <GridListTile key={screen.id} onClick={() => setFocus(screen.id)} className={screen.id === focus && classes.border}>
                                <img src={screen.thumbnail.toDataURL()} alt={screen.name} />
                                <GridListTileBar
                                    title={screen.name}
                                />
                            </GridListTile>
                        ))}
                    </GridList>
                }

                <br />
                <div className="text-right">
                    <button type="submit" className="btn btn-default" onClick={close}>Cancel </button>
                    <button type="submit" className="btn btn-success" onClick={shareScreen} disabled={focus === null}>Share</button>
                </div>
            </Modal.Body>
        </Modal>
    );
}

ScreenSharingModal.propTypes = {
    show           : PropTypes.bool.isRequired,
    close          : PropTypes.func.isRequired,
    getLocalScreen : PropTypes.func
};


module.exports = ScreenSharingModal;
