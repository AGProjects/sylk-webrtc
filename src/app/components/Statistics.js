
'use strict';

const React          = require('react');
const PropTypes      = require('prop-types');

const { Box } = require('@material-ui/core');

const {Tab, Tabs} = require('../MaterialUIAsBootstrap');
const Charts = require('./Statistics/Charts');

/* eslint-disable react/no-multi-comp */
const  TabPanel = (props) => {
    const { children, value, index } = props;
    return (
        <div
            role="tabpanel"
            hidden={value !== index}
            id={`tabpanel-${index}`}
            aria-labelledby={`tab-${index}`}
        >
            {value === index && (
                <Box>{children}</Box>
            )}
        </div>
    );
}

TabPanel.propTypes = {
      children: PropTypes.node,
      index: PropTypes.any.isRequired,
      value: PropTypes.any.isRequired
};

function a11yProps(index) {
    return {
        id: `tab-${index}`,
        'aria-controls': `tabpanel-${index}`
    };
}

const Statistics = ({
    videoData,
    audioData,
    lastData,
    videoElements,
    video,
    details
}) => {
    const [value, setValue] = React.useState(0);
    const videoGraphs = video !== undefined && video !== false;

    const handleChange = (event, newValue) => {
        setValue(newValue);
    };

    return (
        <div style={{marginTop: '-15px'}}>
        {videoGraphs ?
            <React.Fragment>
                <Tabs
                    value={value}
                    indicatorColor="primary"
                    textColor="primary"
                    onChange={handleChange}
                    aria-label="Tabs for Statistics"
                    style={{margin: '0 -15px 15px'}}
                    variant="fullWidth"
                >
                    <Tab label="Video" {...a11yProps(0)}/>
                    <Tab label="Audio" {...a11yProps(1)}/>
                </Tabs>
                <TabPanel value={value} index={0}>
                    <Charts
                        data={videoData}
                        videoElements={videoElements}
                        lastData={lastData}
                        video
                        details={details}
                    />
                </TabPanel>
                <TabPanel value={value} index={1}>
                    <Charts
                        data={audioData}
                        lastData={lastData}
                    />
                </TabPanel>
            </React.Fragment>
        :
            <Charts
                data={audioData}
                lastData = {lastData}
            />
        }
        </div>
    )
};

Statistics.propTypes = {
    videoData: PropTypes.array,
    audioData: PropTypes.array,
    lastData: PropTypes.object,
    videoElements: PropTypes.object,
    video: PropTypes.bool,
    details: PropTypes.bool
};


module.exports = Statistics;

