
import React from 'react';
import clsx from 'clsx';
import * as imageConversion from 'image-conversion';
import { resolveMime } from 'friendly-mimes';

import { makeStyles } from '@material-ui/core/styles';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogContentText,
    DialogActions,
    IconButton,
    ImageList,
    ImageListItem,
    Menu,
    MenuItem,
    Paper,
    Grid,
    Typography,
    Divider
} from '@material-ui/core';
import CloseIcon from '@material-ui/icons/Close';
import FileIcon from '@material-ui/icons/DescriptionOutlined'
import MoreHorizIcon from '@material-ui/icons/MoreHoriz';

import ConferenceChatEditor from './ConferenceChatEditor';


interface ContactDeleteModelProps {
    show: boolean;
    close: () => void;
    onConfirm: (files: File[], caption: string, uri: string) => void;
    upload: { files: File[], uri: string } | null;
}

function fileSize(size: number) {
    let i = Math.floor(Math.log(size) / Math.log(1024));
    return (size / Math.pow(1024, i)).toFixed(1) + ' ' + ['B', 'kB', 'MB', 'GB', 'TB'][i];
};

const styleSheet = makeStyles((theme) => ({
    bigger: {
        '&> h2': {
            fontSize: '20px'
        },
        '&> div > p ': {
            fontSize: '14px'
        },
        '&> li.MuiListSubheader-root': {
            fontSize: '14px',
            textAlign: 'left'
        }
    },
    fixFont: {
        fontFamily: 'inherit',
        fontSize: '14px',
        textAlign: 'left'
    },
    darkerText: {
        color: '#333'
    },

    closeButton: {
        position: 'absolute',
        right: theme.spacing(1),
        top: theme.spacing(1.5),
        color: theme.palette.grey[500]
    },
    menuButton: {
        position: 'absolute',
        left: theme.spacing(1),
        top: theme.spacing(1.2),
        color: '#337ab7',
        '& svg': {
            fontSize: '2rem'
        }
    },
    resetHeight: {
        height: 'auto !important',
        justifyContent: 'flex-start',
        alignItems: 'normal',
        textAlign: 'left',

        '& > div:first-child': {
            margin: '0 !important'
        },

        '& .editor-wrapper': {
            border: 0,
            boxShadow: 'none'
        }

    },
    image: {
        objectFit: 'contain',
        maxWidth: '100%',
        maxHeight: '100%'
    }

}));

const FileUploadModal = ({ show, close, onConfirm, upload = null }: ContactDeleteModelProps) => {
    const { files: rawFiles = [], uri } = upload ?? {};
    const [files, setFiles] = React.useState<File[]>([]);
    const [compressionMode, setCompressionMode] = React.useState<'compressed' | 'original' | 'large'>('compressed');
    const [menuAnchor, setMenuAnchor] = React.useState<null | HTMLElement>(null);

    const classes = styleSheet();
    const type = files.some(f => !f.type.startsWith('image/')) ? 'list' : 'images';

    React.useEffect(() => {
        const compress = async () => {
            const compressed = await Promise.all(rawFiles.map(async (file) => {
                if (!file.type.startsWith('image/') || compressionMode === 'original') return file;

                let blob: Blob;
                if (compressionMode === 'large') {
                    blob = await imageConversion.compress(file, {
                        width: 2560,
                        quality: 0.92
                    });
                } else {
                    const isPng = file.type === 'image/png';
                    blob = await imageConversion.compressAccurately(file, {
                        size: isPng ? 500 : 150,
                        width: 1280,
                        quality: isPng ? 0.95 : 0.82
                    });
                }
                return new File([blob], file.name, { type: file.type, lastModified: file.lastModified });
            }));
            setFiles(compressed as File[]);
        };
        compress();
    }, [rawFiles, compressionMode]);

    const images = () => {
        const list = []
        for (const file of files) {
            if (file instanceof File) {
                let filetype = 'Unknown';
                if (file.type) {
                    try {
                        filetype = resolveMime(file.type).name;
                    }
                    catch (error) {
                        filetype = file.type;
                    }
                }
                if (file.type.startsWith('image/') && type === 'images') {
                    list.push(<ImageListItem key={file.name}><img className={classes.image} src={URL.createObjectURL(file)} /></ImageListItem>);
                } else {
                    list.push(
                        <Paper key={file.name} elevation={0}>
                            <Grid container spacing={2}>
                                <Grid item>
                                    {file.type.startsWith('image/') ?
                                        <img className={classes.image} src={URL.createObjectURL(file)}
                                            style={{ width: 64, height: 64, objectFit: 'cover', display: 'block' }}
                                        />
                                        :
                                        <FileIcon className={classes.fixFont} style={{ height: '100%', margin: '0 auto', fontSize: 45 }} />
                                    }
                                </Grid>
                                <Grid style={{ display: 'flex', alignItems: 'center' }} item>
                                    <div>
                                        <Typography className={classes.fixFont} style={{ fontSize: 16, fontWeight: 300 }} variant="subtitle1">
                                            {file.name}
                                        </Typography>
                                        <Typography className={classes.fixFont} style={{ fontSize: 12 }} variant="body2" color="textSecondary">{fileSize(file.size)} {filetype}</Typography>
                                    </div>
                                </Grid>
                            </Grid>
                        </Paper >
                    );
                }
            }
        }
        return list;
    }

    const handleSend = (content: string, type: string) => {
        onConfirm(files, content, uri);
    }

    return (
        <Dialog
            open={show}
            onClose={(event, reason) => {
                close();
                if (reason !== 'backdropClick') {
                    close();
                }
            }}
            maxWidth="sm"
            fullWidth={true}
            aria-labelledby="dialog-titile"
            aria-describedby="dialog-description"
            disableEscapeKeyDown
        >
            <DialogTitle id="dialog-title" className={classes.bigger}>
                {files.some(f => f.type.startsWith('image/')) && <>
                    <IconButton className={classes.menuButton} onClick={(e) => setMenuAnchor(e.currentTarget)}>
                        <MoreHorizIcon />
                    </IconButton>
                    <Menu
                        anchorEl={menuAnchor} open={Boolean(menuAnchor)} onClose={() => setMenuAnchor(null)}
                        getContentAnchorEl={null}
                        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
                        transformOrigin={{ vertical: 'top', horizontal: 'left' }}
                    >
                        <MenuItem className={classes.fixFont} selected={compressionMode === 'compressed'} onClick={() => { setCompressionMode('compressed'); setMenuAnchor(null); }}>With compression</MenuItem>
                        <MenuItem className={classes.fixFont} selected={compressionMode === 'original'} onClick={() => { setCompressionMode('original'); setMenuAnchor(null); }}>Without compression</MenuItem>
                        <Divider />
                        <MenuItem className={classes.fixFont} selected={compressionMode === 'large'} onClick={() => { setCompressionMode('large'); setMenuAnchor(null); }}>Send large photos</MenuItem>
                    </Menu>
                </>}
                {files?.length} {type === 'images' && 'media'} files
                <IconButton aria-label="close" className={classes.closeButton} onClick={() => close()}>
                    <CloseIcon />
                </IconButton>
            </DialogTitle>
            <DialogContent dividers>
                <DialogContentText id="dialog-description" component="div" className={clsx(classes.fixFont, classes.darkerText)}>
                    <>
                        {type === 'images' ?
                            <ImageList rowHeight="auto" cols={files.length === 1 ? 1 : 2}>
                                {images()}
                            </ImageList>
                            :
                            images()
                        }
                    </>
                </DialogContentText>
            </DialogContent>
            <DialogActions className={clsx('conference-drawer', classes.resetHeight)}>
                <ConferenceChatEditor
                    onSubmit={handleSend}
                    onTyping={() => { }}
                    scroll={() => { }}
                    focus={() => { }}
                    enableVoiceMessage={false}
                    toggleRecordVoiceMessage={() => { }}
                    editMessage={''}
                    cancelEdit={() => { }}
                    type="caption"
                />
            </DialogActions>
        </Dialog >
    );
}


export default FileUploadModal;
