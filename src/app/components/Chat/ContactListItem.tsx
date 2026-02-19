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
import DragAndDrop from '../DragAndDrop';
import UserIcon from '../UserIcon';
import {Contact} from '../../types/Contact';


interface ContactListItemProps {
    contact: Contact;
    selectedUri: string;
    numbers: Record<string, number>;
    filter: string;
    switchChat: (uri: string) => void;
    uploadFiles: (files: File[], uri: string) => void;
    classes: Record<string, string>;
    getHighlightedText: (text: string, filter: string) => React.ReactNode;
    parseContent: (msg: any, contact: Contact) => string;
    formatTime: (msg: any) => string;
    statusIcon: (msg: any) => React.ReactNode;
    contactRef: React.MutableRefObject<string | null>;
    setAnchorEl: (el: any) => void;
}

const ContactListItem: React.FC<ContactListItemProps> = ({
    contact,
    selectedUri,
    numbers,
    filter,
    switchChat,
    uploadFiles,
    classes,
    getHighlightedText,
    parseContent,
    formatTime,
    statusIcon,contactRef,setAnchorEl
}) => {
    return (
        <>
            <ListItem
                className={selectedUri == contact.uri ? classes.selected : classes.listItem}
                alignItems="flex-start"
                onClick={() => switchChat(contact.uri)}
                onContextMenu={(e) => {
                    e.preventDefault();
                    contactRef.current = contact.uri;

                    const { clientX, clientY } = e;

                    const virtualEl = {
                        clientWidth: 0,
                        clientHeigth: 0,
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
                    handleDrop={(files) => uploadFiles(files, contact.uri)}
                >
                    <ListItemAvatar style={{ minWidth: 60, marginTop: 0 }}>
                        <UserIcon identity={contact} active={false} chatContact />
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
                                        {getHighlightedText(contact.displayName || contact.uri, filter)}
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
                                        {contact.message && parseContent(contact.message, contact)}
                                    </Typography>
                                </Grid>
                                {selectedUri !== contact.uri && numbers[contact.uri] !== 0 && (
                                        <Grid component="span" item>
                                            <Avatar
                                                component="span"
                                                style={{
                                                    backgroundColor: 'rgb(92,184,92)',
                                                    width: 20,
                                                    height: 20
                                                }}
                                            >
                                                {numbers[contact.uri]}
                                            </Avatar>
                                        </Grid>
                                )}
                            </Grid>
                        }
                    />
                </DragAndDrop>
            </ListItem>
            <Divider
                style={selectedUri === contact.uri ? { background: 'transparent' } : {}}
                component="li"
                key={`divider_${contact.uri}`}
            />
        </>
    );
};

export default ContactListItem;

