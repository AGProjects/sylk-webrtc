import React from 'react';
import { Typography, Paper, TextField } from '@material-ui/core';
import { makeStyles, Theme } from '@material-ui/core/styles';
import { Contact } from '../../types/Contact';


interface ContactDetailNameProps {
    contact: Contact;
    formContact: Contact;
    editContact: boolean;
    onChange: (name: string) => void;
    onSubmit: () => void;
}

const useStyles = makeStyles((theme: Theme) => ({
    center: {
        display: 'block',
        textAlign: 'center',
        marginTop: '10px',
        marginBottom: '4px',
        fontFamily: 'inherit'
    },
    center1: {
        display: 'block',
        textAlign: 'center',
        marginTop: '4px',
        marginBottom: '20px',
        fontFamily: 'inherit'
    },
    inputh3: {
        fontSize: 24,
        fontWeight: 400,
        '& > input': {
            padding: 0
        }
    },
    label: {
        fontSize: 16,
        '&.Mui-focused': {
            color: 'inherit'
        }
    },
    formroot: {
        '& > *': {
            margin: theme.spacing(1)
        }
    }
}));

const ContactDetailName = ({ contact, formContact, editContact, onChange, onSubmit }: ContactDetailNameProps) => {
    const classes = useStyles();

    if (editContact) {
        return (
            <Paper elevation={0} style={{ marginBottom: '20px', marginTop: '20px' }}>
                <form
                    className={classes.formroot}
                    noValidate
                    autoComplete="off"
                    onSubmit={(e) => {
                        e.preventDefault();
                        onSubmit();
                    }}
                >
                    <TextField
                        key={formContact.id}
                        id={formContact.id}
                        label=""
                        value={formContact.name}
                        onChange={(e) => onChange(e.target.value)}
                        InputProps={{
                            classes: { root: classes.inputh3 },
                            disableUnderline: true,
                        }}
                        InputLabelProps={{
                            classes: { root: classes.label }
                        }}
                        fullWidth
                    />
                </form>
            </Paper>
        );
    }

    return (
        <>
            <Typography className={classes.center} variant="h3" noWrap>
                {contact.name || contact.defaultUri?.uri}
            </Typography>
            <Typography className={classes.center1} variant="h4" noWrap>
                {contact.name && contact.name !== contact.defaultUri?.uri &&
                    <span>{contact.defaultUri?.uri}</span>
                }
            </Typography>
        </>
    );
};

export default ContactDetailName;
