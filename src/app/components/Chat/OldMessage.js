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
    Lock: LockIcon,
} = require('@material-ui/icons');


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

    const preHtmlEntities = (str) => {
        return String(str).replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    };

    const postHtmlEntities = (str) => {
        return String(str).replace(/(?!&amp;|&lt;|&gt;|&quot;)&/g, '&amp;');
    };

    const customUrlRegexp = () => (/((?:https?(?::\/\/))(?:www\.)?(?:[a-zA-Z\d-_.]+(?:(?:\.|@)[a-zA-Z\d]{2,})|localhost)(?:(?:[-a-zA-Z\d:%_+.~#!?&//=@();]*)(?:[,](?![\s]))*)*)/g);

    useEffect(() => {
        if (message.contentType === 'text/html') {
            setParsedContent(parse(message.content.trim(), {
                replace: (domNode) => {
                    if (domNode.attribs && domNode.attribs.href) {
                        domNode.attribs.target = '_blank';
                        return;
                    }
                    if (domNode.type === 'text') {
                        if (!domNode.parent || (domNode.parent.type === 'tag' && domNode.parent.name !== 'a')) {
                            let url = linkifyUrls(preHtmlEntities(domNode.data), {
                                customUrlRegexp,
                                attributes: {
                                    target: '_blank',
                                    rel: 'noopener noreferrer'
                                }
                            });
                            return (<span>{parse(postHtmlEntities(url))}</span>);
                        }
                    }
                }
            }));
        } else if (message.contentType.startsWith('image/')) {
            const image = `data:${message.contentType};base64,${message.content}`
            setParsedContent(<img className="img-responsive" src={image} />);
        } else if (message.contentType === 'text/plain') {
            const linkfiedContent = linkifyUrls(preHtmlEntities(message.content), {
                customUrlRegexp,
                attributes: {
                    target: '_blank',
                    rel: 'noopener noreferrer'
                }
            })

            setParsedContent(
                <pre>{parse(postHtmlEntities(linkfiedContent))}</pre>
            );
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
    }, [message, classes]) // eslint-disable-line react-hooks/exhaustive-deps

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
