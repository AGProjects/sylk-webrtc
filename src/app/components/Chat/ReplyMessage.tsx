import React, { useState, useEffect, useMemo } from 'react';
import clsx from 'clsx';
import { Media } from 'react-bootstrap';
import { Paper, Typography } from '@material-ui/core';
import { makeStyles } from '@material-ui/core/styles';
import { DescriptionOutlined as FileIcon, GraphicEq as AudioIcon } from '@material-ui/icons';
import { resolveMime } from 'friendly-mimes';
import { useAddressbook } from '../../AddressbookProvider';
import fileTransferUtils from '../../fileTransferUtils';
import { linkify } from '../../utils';


interface FileData {
    filetype?: string;
    filename?: string;
    filesize?: number;
}

interface Metadata {
    action: string;
    value?: string;
}

interface Sender {
    uri: string;
    name?: string;
}

interface MessageType {
    sender: Sender;
    contentType: string;
    content: string;
    metadata?: Metadata[];
    json?: FileData;
}

interface Props {
    message: MessageType;
    continues?: boolean;
}

function fileSize(size: number): string {
    let i = Math.floor(Math.log(size) / Math.log(1024));
    return (size / Math.pow(1024, i)).toFixed(1) + ' ' + ['B', 'kB', 'MB', 'GB', 'TB'][i];
};

function getFirstLine(content: string, contentType: string): string {
    let text = content;
    if (contentType === 'text/html') {
        const div = document.createElement('div');
        div.innerHTML = content;
        text = div.textContent || '';
    }
    return text.split('\n')[0].trim();
}

const useStyles = makeStyles({
    fixFont: {
        fontFamily: 'inherit'
    },
    paper: {
        padding: '4px 8px',
        backgroundColor: '#e6f4ea',
        borderLeft: '4px solid #3c763d',
        marginBottom: '8px',
        overflow: 'hidden',
        minWidth: 0,
        fontSize: '12px',

        '& pre': {
            margin: 0,
            whiteSpace: 'pre-wrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            fontFamily: 'inherit',
            background: 'transparent',
            border: 'none',
            padding: 0,
            fontSize: '12px !important',
        },

        '& span': {
            overflow: 'hidden',
            textOverflow: 'ellipsis',
        },
    },
    paperNoContinues: {
        minWidth: 'calc(100% - 40px)',
        maxWidth: 'calc(100% - 40px)'
    },
    paperContinues: {
        minWidth: 'calc(100% - 15px)',
        maxWidth: 'calc(100% - 15px)'
    },
    contentRow: {
        display: 'flex',
        gap: '8px',
        alignItems: 'center'
    },
    imagePaper: {
        display: 'inline-block',
        borderRadius: 7,
        overflow: 'hidden',
        cursor: 'zoom-in'
    },
    imageThumb: {
        width: '40px',
        height: '40px',
        objectFit: 'cover' as const
    },
    filePaper: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: 40,
        height: 40,
        flexShrink: 0
    },
    fileIcon: {
        fontSize: 40
    },
    fileInfo: {
        minWidth: 0,
        flex: 1
    },
    fileMetaRow: {
        display: 'flex',
        gap: '4px'
    },
    fileNameText: {
        flex: '1 1 auto',
        fontSize: 12,
        fontWeight: 300,
        textOverflow: 'ellipsis',
        overflow: 'hidden',
        fontFamily: 'inherit',
        lineHeight: 1
    },
    fileSizeText: {
        flex: '0 0 auto',
        fontSize: 12,
        fontWeight: 300,
        fontFamily: 'inherit',
        lineHeight: 1
    },
    contentDiv: {
        minWidth: '100%',
        textOverflow: 'ellipsis',
        width: 0,
        overflow: 'hidden',
        wordBreak: 'normal' as const,
        whiteSpace: 'nowrap' as const
    }
});

const ReplyMessage = ({ message, continues }: Props) => {
    const classes = useStyles();
    const [parsedContent, setParsedContent] = useState<React.ReactNode>();
    const { lookup } = useAddressbook();
    const contact = useMemo(() => lookup(message.sender.uri), [lookup, message.sender.uri]);

    useEffect(() => {
        let ignore = false;
        if (message.contentType === 'application/sylk-file-transfer') {
            const fileData = message.json;
            if (!fileData) return;

            const label = message.metadata?.find(m => m.action === 'label');
            if (fileData.filetype && fileData.filetype.startsWith('image/')) {
                fileTransferUtils.getThumbnail(message)
                    .then(([image, filename, w, h]) => {
                        if (!ignore) setParsedContent(
                            <div className={classes.contentRow}>
                                <Paper variant="outlined" className={classes.imagePaper}>
                                    <img className={clsx('img-responsive', 'img-rounded', classes.imageThumb)} src={image} onClick={() => { }} />
                                </Paper>
                                <div>
                                    <Media.Heading>{contact?.name}&nbsp;</Media.Heading>
                                    <pre>{linkify(label?.value)}</pre></div>
                            </div>
                        );
                    }).catch();

            } else {
                let filetype = 'Unknown';
                if (fileData.filetype) {
                    try {
                        filetype = resolveMime(fileData.filetype).name;
                    }
                    catch (error) {
                        filetype = fileData.filetype;
                    }
                }
                if (fileData.filename && fileData.filename.startsWith('sylk-audio-recording')) {
                    setParsedContent(
                        <div className={classes.contentRow}>
                            <Paper key={fileData.filename} elevation={0}>
                                <AudioIcon className={classes.fileIcon} />
                            </Paper>
                            <div className={classes.fileInfo}>
                                <Media.Heading>{contact?.name}&nbsp;</Media.Heading>
                                <div className={classes.fileMetaRow}>
                                    <Typography className={classes.fixFont} classes={{ root: classes.fileNameText }} variant="subtitle1">
                                        Audio Message
                                    </Typography>
                                </div>
                            </div>
                        </div>);
                } else {
                    setParsedContent(
                        <div className={classes.contentRow}>
                            <Paper key={fileData.filename} elevation={0}>
                                <FileIcon className={classes.fileIcon} />
                            </Paper>
                            <div className={classes.fileInfo}>
                                <Media.Heading>{contact?.name}&nbsp;</Media.Heading>
                                <div className={classes.fileMetaRow}>
                                    <Typography className={classes.fixFont} classes={{ root: classes.fileNameText }} variant="subtitle1">
                                        {fileData.filename}
                                    </Typography>
                                    <Typography className={classes.fixFont} classes={{ root: classes.fileSizeText }} variant="subtitle1">
                                        {fileData.filesize !== undefined && fileSize(fileData.filesize)} {filetype}
                                    </Typography></div>
                            </div>
                        </div>);
                }
            }
        } else {
            setParsedContent(getFirstLine(message.content, message.contentType));
        }
        return () => { ignore = true; };
    }, [message, contact, classes]);

    return (
        <Paper elevation={0}
            className={clsx(classes.paper, !continues ? classes.paperNoContinues : classes.paperContinues)}
        >
            {message.contentType !== 'application/sylk-file-transfer' && (
                <Media.Heading>{contact.name}&nbsp;</Media.Heading>)
            }
            <div className={classes.contentDiv}>
                {parsedContent}
            </div>
        </Paper>

    );
};


export default ReplyMessage;
