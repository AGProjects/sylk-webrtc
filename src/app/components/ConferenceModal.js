'use strict';

const React          = require('react');
const useState       = React.useState;
const useEffect      = React.useEffect;
const PropTypes      = require('prop-types');
const { default: clsx } = require('clsx');

const { makeStyles }    = require('@material-ui/core/styles');
const { Dialog, DialogTitle, DialogContent, DialogActions, IconButton }   = require('@material-ui/core');
const { Switch, FormGroup, FormControl, FormControlLabel, Tab, Tabs } = require('@material-ui/core');
const { Accordion, AccordionSummary, AccordionDetails, Typography } = require('@material-ui/core');
const config            = require('../config');

const useStyles = makeStyles((theme) => ({
    heading: {
        fontFamily: 'inherit',
        fontSize: '12px',
        flexBasis: '33.33%',
        flexShrink: 0
    },
    secondaryHeading: {
        fontFamily: 'inherit',
        fontSize: '12px',
        color: theme.palette.text.secondary
    },
    label: {
        fontFamily: 'inherit',
        justifyContent: 'space-between',
        width: '100%',
        marginLeft: 0
    },
    labelText: {
        fontFamily: 'inherit',
        fontSize: '14px'
    },
    group: {
        fontFamily: 'inherit',
        width: '100%'
    },
    details: {
        fontFamily: 'inherit',
        flexDirection: 'column'
    },
    bigger: {
        '&> h2': {
            fontFamily: 'inherit',
            fontSize: '18px',
            fontWeight: 300
        }
    },
    closeButton: {
        position: 'absolute',
        right: theme.spacing(1),
        top: theme.spacing(1),
        color: theme.palette.grey[500]
    }
}));

const ConferenceModal = (props) => {
    const classes = useStyles();
    const [conferenceTargetUri, setConferenceTargetUri] = useState('');
    const [tab, setTab] = useState('voice');
    const [lowBandwidth, setLowBandwith] = useState(false);
    const [roomMedia, setRoomMedia] = useState({
        audio: true,
        video: true
    });
    const mediaConstraints = {
        audio: true,
        video: true
    };

    useEffect(() => {
            setConferenceTargetUri(props.conference);
    }, [props.conference]);

    const joinWithAudio = (event) => {
        event.preventDefault();
        mediaConstraints['video'] = false;
        join(event);
    }

    const handleRoomMedia = (event) => {
        let newRoomMedia = Object.assign({}, roomMedia);
        newRoomMedia[event.target.name] = !event.target.checked;
        setRoomMedia(newRoomMedia);
    }

    const getOptions = () => {
        return {
            mediaConstraints,
            roomMedia,
            lowBandwidth
        }
    }

    const join = (event) => {
        event.preventDefault();
        const uri = `${conferenceTargetUri.replace(/[\s()-]/g, '')}@${config.defaultConferenceDomain}`;
        props.handleConferenceCall(uri.toLowerCase(), getOptions());
    }

    const onHide = () => {
        props.handleConferenceCall(null);
    }

    const validUri = conferenceTargetUri.length > 0 && conferenceTargetUri.indexOf('@') === -1;

    const btnClasses = clsx({
        'btn'         : true,
        'btn-success' : validUri && roomMedia.audio,
        'btn-warning' : !validUri || !roomMedia.audio
    });

    const videoBtnClasses = clsx({
        'btn'         : true,
        'btn-success' : validUri && !lowBandwidth && roomMedia.video,
        'btn-warning' : !validUri || lowBandwidth || !roomMedia.video
    });

    return (
        <Dialog
            open={props.show}
            onClose={onHide}
            maxWidth="sm"
            fullWidth={true}
            aria-labelledby="dialog-title"
        >
            <DialogTitle id="dialog-title" className={classes.bigger}>Join Conference
                <IconButton aria-label="close" className={classes.closeButton} onClick={onHide}>
                    <i className="fa fa-times" />
                </IconButton>
            </DialogTitle>
            <form onSubmit={join}>
                <DialogContent dividers>
                    <p className="lead">Enter the room you wish to join</p>
                        <label htmlFor="inputTarget" className="sr-only">Conference Room</label>
                        <div className="input-group">
                            <span className="input-group-addon"><i className="fa fa-users fa-fw"></i></span>
                            <input
                                id="inputTarget"
                                className="form-control"
                                placeholder="Conference Room"
                                onChange={e => setConferenceTargetUri(e.target.value)}
                                value={conferenceTargetUri}
                                required
                                autoFocus
                            />
                        </div>
                        <br />
                        <Accordion>
                            <AccordionSummary
                                aria-controls="panel1a-content"
                                id="panel1a-header"
                                expandIcon={<i className="fa fa-chevron-down" />}
                            >
                                <Typography align="left" className={classes.heading}>Conference options</Typography>
                            </AccordionSummary>
                            <Tabs
                                value={tab}
                                indicatorColor="primary"
                                textColor="primary"
                                onChange={(event, value) => {setTab(value)}}
                                variant="fullWidth"
                            >
                                <Tab value="voice" label="Low Bandwith" />
                                <Tab value="room"  label="Options" />
                            </Tabs>
                            { tab === 'voice' &&
                                <AccordionDetails className={classes.details}>
                                    <FormControl className={classes.group} component="fieldset">
                                        <FormGroup row>
                                            <FormControlLabel
                                                control={
                                                    <Switch
                                                        checked={lowBandwidth}
                                                        onChange={(event) => setLowBandwith(event.target.checked)}
                                                        color="primary"
                                                        name="low-bandwith"
                                                        inputProps={{'aria-label': 'enable low bandwidth mode'}}
                                                    />
                                                }
                                                className={classes.label}
                                                label={<Typography className={classes.labelText}>Join the conference in low-bandwidth mode</Typography>}
                                                labelPlacement="start"
                                            />
                                        </FormGroup>
                                    </FormControl>
                                    <Typography align="left" className={classes.secondaryHeading}>Low bandwidth mode means you will participate with audio and chat. Screensharing and video is not available.</Typography>
                                </AccordionDetails>
                            }
                            { tab === 'room' &&
                                <AccordionDetails className={classes.details}>
                                    <Typography align="left" className={classes.secondaryHeading}>These options only apply when you are creating a room</Typography>
                                    <FormControl className={classes.group} component="fieldset">
                                        <FormGroup row>
                                            {/*<FormControlLabel
                                                control={
                                                    <Switch
                                                        checked={!roomMedia.audio}
                                                        onChange={handleRoomMedia}
                                                        color="primary"
                                                        name="audio"
                                                        inputProps={{'aria-label': 'enable audio support'}}
                                                    />
                                                }
                                                className={classes.label}
                                                label={<Typography className={classes.labelText}>Support voice in the conference room</Typography>}
                                                labelPlacement="start"
                                            />*/}
                                            <FormControlLabel
                                                control={
                                                    <Switch
                                                        checked={!roomMedia.video}
                                                        onChange={handleRoomMedia}
                                                        color="primary"
                                                        name="video"
                                                        inputProps={{'aria-label': 'disable video support'}}
                                                    />
                                                }
                                                className={classes.label}
                                                label={<Typography className={classes.labelText}>Disable video and screensharing in the conference room</Typography>}
                                                labelPlacement="start"
                                            />
                                        </FormGroup>
                                    </FormControl>
                                </AccordionDetails>
                            }
                        </Accordion>
                </DialogContent>
                <DialogActions>
                    <div className="btn-group" role="group" aria-label="...">
                        <button type="button" className={btnClasses} disabled={!validUri || !roomMedia.audio} onClick={joinWithAudio}><i className="fa fa-phone"></i> Audio</button>
                        <button type="submit" className={videoBtnClasses} disabled={!validUri || lowBandwidth || !roomMedia.video}><i className="fa fa-video-camera"></i> Video</button>
                    </div>
                </DialogActions>
            </form>
        </Dialog>
    );
}

ConferenceModal.propTypes = {
    show: PropTypes.bool.isRequired,
    handleConferenceCall: PropTypes.func.isRequired,
    conference: PropTypes.string
};


module.exports = ConferenceModal;
