'use strict';

const React = require('react');
const useState = React.useState;
const useEffect = React.useEffect;
const PropTypes = require('prop-types');
const ReactBootstrap = require('react-bootstrap');
const Media = ReactBootstrap.Media;
const { default: parse } = require('html-react-parser');
const linkifyUrls = require('linkify-urls');
const { Chip } = require('@material-ui/core');
const { makeStyles } = require('@material-ui/core/styles');
const {
    Lock: LockIcon
} = require('@material-ui/icons');

const { linkify, customUrlRegexp } = require('../../utils');


const styleSheet = makeStyles((theme) => ({
    chipSmall: {
        height: 18,
        fontSize: 11
    },
    iconSmall: {
        width: 12,
        height: 12
    },
    lockIcon: {
        fontSize: 15,
        verticalAlign: 'middle',
        color: '#ccc'
    }
}));

const Message = ({
    message
}) => {
    const classes = styleSheet();
    const [parsedContent, setParsedContent] = useState();

    useEffect(() => {
        if (message.contentType === 'application/sylk-file-transfer') {
            const metadata = message.metadata?.find(m => m.action === 'label');
            setParsedContent(linkify(metadata?.value || ''));
            return;
        }
        if (message.contentType === 'text/html') {
            setParsedContent(parse(message.content.trim(), {
                replace: (domNode) => {
                    if (domNode.attribs && domNode.attribs.href) {
                        domNode.attribs.target = '_blank';
                        return;
                    }
                    if (domNode.type === 'text') {
                        if (!domNode.parent || (domNode.parent.type === 'tag' && domNode.parent.name !== 'a')) {
                            let url = linkifyUrls(domNode.data, {
                                customUrlRegexp,
                                attributes: {
                                    target: '_blank',
                                    rel: 'noopener noreferrer'
                                }
                            });
                            return <span dangerouslySetInnerHTML={{ __html: url }} />;
                        }
                    }
                }
            }));
        } else if (message.contentType.startsWith('image/')) {
            const image = `data:${message.contentType};base64,${message.content}`
            setParsedContent(<img className="img-responsive" src={image} />);
        } else if (message.contentType === 'text/plain') {
            setParsedContent(<pre>{linkify(message.content)}</pre>);
        } else if (message.contentType === 'text/pgp-public-key') {
            setParsedContent(
                <Chip
                    component="span"
                    classes={{ sizeSmall: classes.chipSmall, iconSmall: classes.iconSmall }}
                    variant="outlined"
                    size="small"
                    icon={<LockIcon />}
                    label="Public key"
                />
            );
        }
    }, [message, classes])

    return (
        <div className="vertical-center" style={{ paddingLeft: '2px', textOverflow: 'ellipsis', marginRight: '10px', overflow: 'hidden' }}>
            <Media.Heading>
                Edit message
            </Media.Heading>
            {parsedContent}
        </div>
    );
};

Message.propTypes = {
    message: PropTypes.object.isRequired
};


module.exports = Message;
