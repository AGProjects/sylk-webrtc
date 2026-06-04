import React, { useState, useRef } from 'react';
import {
    Divider,
    Paper,
    TextField,
    InputAdornment,
    IconButton,
    MenuItem
} from '@material-ui/core';
import { makeStyles, Theme } from '@material-ui/core/styles';
import { CheckCircle, CheckCircleOutline, Delete } from '@material-ui/icons';
import { Tooltip } from '../../MaterialUIAsBootstrap';

import CustomContentMenu from '../CustomContextMenu';
import { copyToClipboard, uniqueId } from '../../utils';
import { Contact, ContactURI } from '../../types/Contact';


const useStyles = makeStyles((theme: Theme) => ({
    input: {
        fontSize: 16,
        color: '#337ab7'
    },
    label: {
        fontSize: 16,
        '&.Mui-focused': {
            color: 'inherit'
        },
        '&.Mui-error': {
            color: '#a94442 !important'
        }
    },
    formroot: {
        '& > div': {
            margin: theme.spacing(1)
        }
    },
    helperText: {
        fontSize: '1.2rem',
        fontFamily: 'inherit',
        color: '#a94442 !important'
    },
    item: {
        fontSize: '14px',
        fontFamily: 'inherit',
        color: '#333',
        minHeight: 0
    }
}));

interface ContactDetailUriListProps {
    formContact: Contact;
    editContact: boolean;
    onChange: (updatedContact: Contact) => void;
    onError: (hasError: boolean) => void;
    onSubmit: () => void;
}

const ContactDetailUriList = ({
    formContact,
    editContact,
    onChange,
    onError,
    onSubmit
}: ContactDetailUriListProps) => {
    const classes = useStyles();
    const emptyUriId = useRef(uniqueId());
    const [showDefault, setDefault] = useState('');
    const [uriError, setUriError] = useState(false);
    const [anchorEl, setAnchorEl] = useState(null)
    const [contextUri, setContextUri] = useState<ContactURI | null>(null);

    const uriList = editContact ? formContact.uris : (formContact.uris ?? []).filter(u => u.uri !== '');

    const handleUriChange = (uri: ContactURI, newValue: string) => {
        let updatedUris = (formContact.uris ?? []).map(u => u.id === uri.id ? { ...u, uri: newValue } : u);
        if (newValue !== '' && uri.id === emptyUriId.current) {
            emptyUriId.current = uniqueId();
            updatedUris.push({ uri: '', id: emptyUriId.current, default: false, type: 'SIP' });
        }
        const filledUris = updatedUris.filter(u => u.uri.trim() !== '');
        const hasError = filledUris.length === 0;
        setUriError(hasError);
        onError(hasError);
        onChange({ ...formContact, uris: updatedUris });
    };

    const handleUriBlur = (uri: ContactURI, index: number) => {
        if (uri.uri.trim() === '' && index !== (formContact.uris ?? []).length - 1) {
            onChange({ ...formContact, uris: (formContact.uris ?? []).filter(u => u.id !== uri.id) });
        }
    };

    const handleDeleteUri = (event: React.MouseEvent<HTMLButtonElement>, uri: ContactURI) => {
        event.preventDefault();
        const updatedUris = (formContact.uris ?? []).filter(u => u.id !== uri.id);
        const filledUris = updatedUris.filter(u => u.uri !== '');
        const newDefault = uri.default ? filledUris[0] : formContact.defaultUri;
        if (newDefault) newDefault.default = true;
        onChange({ ...formContact, uris: updatedUris, defaultUri: newDefault });
    };

    const handleCopyToClipboard = (event: React.MouseEvent<HTMLButtonElement | HTMLLIElement>, address: string) => {
        event.preventDefault();
        copyToClipboard(address);
    };

    const setDefaultUri = (event: React.MouseEvent<HTMLButtonElement>, uri: ContactURI) => {
        event.preventDefault();
        const updatedUris = (formContact.uris ?? []).map(u => ({ ...u, default: u.id === uri.id }));
        setDefault(uri.id);
        onChange({ ...formContact, uris: updatedUris, defaultUri: uri });
    };

    const handleContextMenu = (e: React.MouseEvent<HTMLDivElement>, uri: ContactURI) => {
        if (editContact) return;
        e.preventDefault();
        const { clientX, clientY } = e;
        setContextUri(uri);
        setAnchorEl({
            clientWidth: 0,
            clientHeight: 0,
            getBoundingClientRect: () => ({
                width: 0, height: 0,
                top: clientY, right: clientX,
                bottom: clientY, left: clientX
            })
        });
    };

    const handleClose = () => {
        setAnchorEl(null);
    };

    return (
        <Paper elevation={0} style={{ marginBottom: '20px' }} className={classes.formroot}>
            <CustomContentMenu open={Boolean(anchorEl)} anchorEl={anchorEl} onClose={handleClose} keepMounted={false}>
                <MenuItem className={classes.item} onClick={(e) => { handleCopyToClipboard(e, contextUri!.uri); handleClose(); }}>
                    Copy address
                </MenuItem>
            </CustomContentMenu>
            {(uriList ?? []).map((uri: ContactURI, index: number) => (
                <React.Fragment key={uri.id}>
                    <div onContextMenu={(e) => handleContextMenu(e, uri)}>
                        <TextField
                            key={uri.id}
                            id={uri.id}
                            label={uri.uri !== '' ? 'Address' : 'Add new address'}
                            value={uri.uri}
                            onChange={(e) => handleUriChange(uri, e.target.value)}
                            onFocus={() => setDefault(uri.id)}
                            onBlur={() => { handleUriBlur(uri, index); setDefault(''); }}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    e.preventDefault();
                                    (e.currentTarget as HTMLElement).blur();

                                    const hasErrorNow =
                                        (formContact.uris ?? []).filter(u => u.uri.trim() !== '').length === 0;
                                    if (hasErrorNow) return;
                                    onSubmit();
                                }
                            }}
                            placeholder="New address"
                            error={uriError && uri.uri === '' && index === 0}
                            helperText={uriError && uri.uri === '' && index === 0 ? 'At least one address is required' : ''}
                            FormHelperTextProps={{
                                classes: { root: classes.helperText }
                            }}
                            InputProps={{
                                classes: { root: classes.input },
                                disableUnderline: true,
                                readOnly: !editContact,
                                endAdornment:
                                    <InputAdornment position="end" style={{ marginTop: -16, marginRight: 6 }}>
                                        <>
                                            {(uri.id === formContact.defaultUri?.id && (formContact.uris ?? []).length > 2) ?
                                                <Tooltip title="Default address">
                                                    <CheckCircle style={{ color: 'green', fontSize: '2rem', marginRight: 4 }} />
                                                </Tooltip>
                                                :
                                                (formContact.uris ?? []).length !== 2 && editContact && showDefault === uri.id && uri.uri &&
                                                <Tooltip title="Set as default">
                                                    <IconButton
                                                        onMouseDown={(e) => setDefaultUri(e, uri)}
                                                        size="small"
                                                    >
                                                        <CheckCircleOutline style={{ color: 'grey', fontSize: '18px' }} />
                                                    </IconButton>
                                                </Tooltip>
                                            }
                                            {editContact ?
                                                (formContact.uris ?? []).length > 2 && uri.uri &&
                                                <Tooltip title="Delete address">
                                                    <IconButton
                                                        aria-label="delete address"
                                                        onMouseDown={(e) => handleDeleteUri(e, uri)}
                                                        edge="end"
                                                    >
                                                        <Delete style={{ color: '#d9534f', fontSize: '2rem' }} />
                                                    </IconButton>
                                                </Tooltip>
                                                :
                                                <Tooltip title="Copy address">
                                                    <IconButton
                                                        aria-label="copy address to clipboard"
                                                        onMouseDown={(e) => handleCopyToClipboard(e, uri.uri)}
                                                        edge="end"
                                                    >
                                                        <i className="fa fa-clipboard" />
                                                    </IconButton>
                                                </Tooltip>
                                            }
                                        </>
                                    </InputAdornment>
                            }}
                            InputLabelProps={{
                                classes: { root: classes.label }
                            }}
                            fullWidth
                        />
                    </div>
                    {index !== uriList.length - 1 && <Divider />}
                </React.Fragment>
            ))}
        </Paper>
    );
};

export default ContactDetailUriList;
