import React from 'react';
import clsx from 'clsx';

import { makeStyles } from '@material-ui/core/styles';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogContentText,
    DialogActions
} from '@material-ui/core';
import { Button } from '../MaterialUIAsBootstrap';
import { useAddressbook } from '../AddressbookProvider';

import { Contact } from '../types/Contact';


interface ContactDeleteModelProps {
    contact: Contact;
    show: boolean;
    close: () => void;
    onConfirm: () => void;
}

const styleSheet = makeStyles({
    bigger: {
        '&> h2': {
            fontSize: '20px',
            color: '#d9534f'
        },
        '&> div > p ': {
            fontSize: '14px',
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
    }
});

const ContactDeleteModal = ({ show, close, contact, onConfirm }: ContactDeleteModelProps) => {
    const classes = styleSheet();

    const { addressbook } = useAddressbook();

    const deletedUris = (contact?.uris ?? []).filter(uri => addressbook.contacts.get(uri.uri)?.length === 1);
    const retainedUris = (contact?.uris ?? []).filter(uri => addressbook.contacts.get(uri.uri)?.length > 1);
    return (
        <Dialog
            open={show}
            onClose={(event, reason) => {
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
            <DialogTitle id="dialog-title" className={classes.bigger}>Delete {contact?.name}?</DialogTitle>
            <DialogContent dividers>
                <DialogContentText id="dialog-description" component="div" className={clsx(classes.fixFont, classes.darkerText)}>
                    {contact?._isNew &&
                        <p>This will delete all messages with <strong>{contact?.defaultUri?.uri}</strong>.</p>
                    }
                    {deletedUris.length > 0 &&
                        <>
                        <p>This will also delete <strong>all</strong> messages with the following address{deletedUris.length > 1 && 'es'}:</p>
                        <ul>
                            {deletedUris.map((uriObj, index) => (
                                <li key={index}><strong>{uriObj.uri}</strong></li>
                            ))}
                        </ul>
                        </>
                    }
                    {retainedUris.length > 0 &&
                        <>
                        <p>The messages with the following address{retainedUris.length > 1 && 'es'} will be <strong>not removed</strong> since they are present in other contacts:</p>
                            <ul>
                                {retainedUris.map((uriObj, index) => (
                                    <li key={index}><strong>{uriObj.uri}</strong></li>
                                ))}
                            </ul>
                        </>
                    }
                </DialogContentText>
            </DialogContent>
            <DialogActions>
                <Button variant="contained" onClick={close} title="close">
                    Cancel
                </Button>
                <Button
                    variant="contained"
                    onClick={onConfirm}
                    title="Delete"
                    color="secondary"
                >
                    Delete
                </Button>
            </DialogActions>
        </Dialog >
    );
}


export default ContactDeleteModal;
