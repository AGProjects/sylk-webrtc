import React from 'react';
import {
    ListItem,
    ListItemText,
    ListItemAvatar,
    Grid,
    Typography,
    Avatar,
    Divider
} from '@material-ui/core';

import DragAndDropJS from '../DragAndDrop';
import UserIcon from '../UserIcon';

import { Contact } from '../../types/Contact';


const DragAndDrop = DragAndDropJS as any;

interface ContactListContactProps {
    contact: Contact;
    selectedContact: Contact | null;
    unreadMessages: Record<string, number>;
    filter: string;
    switchChat: (contact: Contact) => void;
    uploadFiles: (files: File[], uri: string) => void;
    classes: Record<string, string>;
    getHighlightedText: (text: string, filter: string) => React.ReactNode;
    parseContent: (msg: any, contact: Contact) => string;
    formatTime: (msg: any) => string;
    statusIcon: (msg: any) => React.ReactNode;
    contactRef: React.MutableRefObject<Contact | null>;
    setAnchorEl: (el: any) => void;
}

const ContactListContact = ({
    contact,
    selectedContact,
    unreadMessages,
    filter,
    switchChat,
    uploadFiles,
    classes,
    getHighlightedText,
    parseContent,
    formatTime,
    statusIcon,
    contactRef,
    setAnchorEl
}: ContactListContactProps) => {
    return (
        <>
            <ListItem
                className={contact.id == selectedContact?.id ? classes.selected : classes.listItem}
                alignItems="flex-start"
                onClick={() => switchChat(contact)}
                onContextMenu={(e) => {
                    e.preventDefault();
                    contactRef.current = contact;

                    const { clientX, clientY } = e;

                    const virtualEl = {
                        clientWidth: 0,
                        clientHeight: 0,
                        getBoundingClientRect: () => ({
                            width: 0,
                            height: 0,
                            top: clientY,
                            right: clientX,
                            bottom: clientY,
                            left: clientX
                        })
                    };
                    setAnchorEl(virtualEl);
                }}
                disableGutters
            >
                <DragAndDrop
                    title="Drop files to share them"
                    small
                    useFlex
                    handleDrop={(files) => uploadFiles(files, contact.defaultUri.uri)}
                >
                    <ListItemAvatar style={{ minWidth: 60, marginTop: 0 }}>
                        <UserIcon identity={contact.identity} active={false} chatContact />
                    </ListItemAvatar>
                    <ListItemText
                        disableTypography
                        primary={
                            <Grid container spacing={0} justifyContent="space-between" alignItems="baseline" wrap="nowrap">
                                <Grid item zeroMinWidth>
                                    <Typography
                                        variant="h4"
                                        className={classes.header}
                                        style={{ flexGrow: 1, overflow: 'hidden', textOverflow: 'ellipsis' }}
                                    >
                                        {getHighlightedText(contact.name || contact.defaultUri.uri, filter)}
                                    </Typography>
                                </Grid>
                                <Grid item className={classes.grid}>
                                    <Typography className={classes.date}>
                                        {contact.message && statusIcon(contact.message)}
                                        {contact.message && formatTime(contact.message)}
                                    </Typography>
                                </Grid>
                            </Grid>
                        }
                        secondary={
                            <Grid component="span" container spacing={2} justifyContent="space-between" alignItems="baseline" wrap="nowrap">
                                <Grid component="span" item zeroMinWidth>
                                    <Typography
                                        className={classes.root}
                                        style={{
                                            flexGrow: 1,
                                            overflow: 'hidden',
                                            textOverflow: 'ellipsis',
                                            color: contact.message && (contact.message.state === 'error' || contact.message.state === 'failed') && '#a94442'
                                        }}
                                    >
                                        {contact._isNew
                                            ? <em style={{ color: '#888' }}>(Draft)</em>
                                                : contact.message && parseContent(contact.message, contact)
                                        }
                                    </Typography>
                                </Grid>
                                {contact.id !== selectedContact?.id &&
                                    contact.uris.some(uri => unreadMessages[uri.uri] > 0) && (
                                        <Grid component="span" item>
                                            <Avatar
                                                component="span"
                                                style={{
                                                    backgroundColor: 'rgb(92,184,92)',
                                                    width: 20,
                                                    height: 20
                                                }}
                                            >
                                                {
                                                    contact.uris.reduce(
                                                        (total, uri) => total + (unreadMessages[uri.uri] || 0),
                                                        0
                                                    )
                                                }
                                            </Avatar>
                                        </Grid>
                                    )}
                            </Grid>
                        }
                    />
                </DragAndDrop>
            </ListItem>
            <Divider
                style={contact.id == selectedContact?.id ? { background: 'transparent' } : {}}
                component="li"
                key={`divider_${contact.id}`}
            />
        </>
    );
};

export default ContactListContact;

