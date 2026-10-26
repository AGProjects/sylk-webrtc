import React from 'react';
import Cropper from 'react-easy-crop';
import type { Area } from 'react-easy-crop';

import { makeStyles } from '@material-ui/core/styles';
import {
    Dialog, DialogTitle, DialogContent, DialogActions,
    IconButton, Button, Slider, Typography
} from '@material-ui/core';
import CloseIcon from '@material-ui/icons/Close';

import { cropToAvatar } from '../utils/cropToAvatar';

interface AvatarCropModalProps {
    show: boolean;
    close: () => void;
    file: File | null;
    onConfirm: (data: string, contentType: string) => void | Promise<void>;
}

const styleSheet = makeStyles((theme) => ({
    title: {
        '&> h2': { fontSize: '20px' }
    },
    fixFont: {
        fontFamily: 'inherit',
        fontSize: '14px'
    },
    closeButton: {
        position: 'absolute',
        right: theme.spacing(1),
        top: theme.spacing(1.5),
        color: theme.palette.grey[500]
    },
    content: {
        padding: 0
    },
    stage: {
        position: 'relative',        // de Cropper vult dit vlak
        width: '100%',
        height: 340,
        background: '#1c1c1c'
    },
    zoom: {
        padding: theme.spacing(2, 4, 1)
    }
}));

const AvatarCropModal = ({ show, close, file, onConfirm }: AvatarCropModalProps) => {
    const classes = styleSheet();
    const [src, setSrc] = React.useState<string | null>(null);
    const [crop, setCrop] = React.useState({ x: 0, y: 0 });
    const [zoom, setZoom] = React.useState(1);
    const [area, setArea] = React.useState<Area | null>(null);
    const [saving, setSaving] = React.useState(false);

    React.useEffect(() => {
        if (!file) {
            setSrc(null);
            return;
        }
        const url = URL.createObjectURL(file);
        setSrc(url);
        setCrop({ x: 0, y: 0 });
        setZoom(1);
        setArea(null);
        return () => URL.revokeObjectURL(url);
    }, [file]);

    const save = async () => {
        if (!src || !area) return;
        setSaving(true);
        try {
            const { data, contentType } = await cropToAvatar(src, area);
            await onConfirm(data, contentType);
        } finally {
            setSaving(false);
        }
    };

    return (
        <Dialog open={show} onClose={() => !saving && close()} maxWidth="xs" fullWidth aria-labelledby="avatar-dialog-title">
            <DialogTitle id="avatar-dialog-title" className={classes.title}>
                Replace photo
                <IconButton aria-label="close" className={classes.closeButton} onClick={() => close()} disabled={saving}>
                    <CloseIcon />
                </IconButton>
            </DialogTitle>
            <DialogContent dividers className={classes.content}>
                <div className={classes.stage}>
                    {src && (
                        <Cropper
                            image={src}
                            crop={crop}
                            zoom={zoom}
                            aspect={1}
                            cropShape="round"
                            showGrid={false}
                            onCropChange={setCrop}
                            onZoomChange={setZoom}
                            onCropComplete={(_, pixels) => setArea(pixels)}
                            style={{ cropAreaStyle: { border: '2px solid #fff' } }}
                        />
                    )}
                </div>
                <div className={classes.zoom}>
                    <Slider
                        value={zoom}
                        min={1}
                        max={4}
                        step={0.01}
                        onChange={(_, value) => setZoom(value as number)}
                        aria-label="Zoom"
                    />
                </div>
                <Typography
                    align="center"
                    color="textSecondary"
                    style={{ padding: '0 24px 16px', fontFamily: 'inherit', fontSize: 12 }}
                >
                    Only you will see this photo.
                </Typography>
            </DialogContent>
            <DialogActions>
                <Button className={classes.fixFont} onClick={() => close()} disabled={saving}>Cancel</Button>
                <Button className={classes.fixFont} color="primary" onClick={save} disabled={saving || !area}>Save</Button>
            </DialogActions>
        </Dialog>
    );
};

export default AvatarCropModal;
