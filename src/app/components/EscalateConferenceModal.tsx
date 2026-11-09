import React, { useState } from 'react';
import { makeStyles } from '@material-ui/core/styles';
import { Dialog, DialogTitle, DialogContent, DialogActions, IconButton } from '@material-ui/core';

import config from '../config';

const useStyles = makeStyles((theme) => ({
    bigger: {
        '&> h2': {
            fontFamily: 'inherit',
            fontSize: '18px',
            fontWeight: 300
        }
    },
    closeButton: {
        position: 'absolute',
        right: theme.spacing(1),
        top: theme.spacing(1),
        color: theme.palette.grey[500]
    }
}));

interface Call {
    remoteIdentity: {
        uri: string;
    };
}

interface EscalateConferenceModalProps {
    show: boolean;
    close: () => void;
    call: Call;
    escalateToConference: (uris: string[]) => void;
}

const EscalateConferenceModal = ({
    show,
    close,
    call,
    escalateToConference,
}: EscalateConferenceModalProps) => {
    const classes = useStyles();
    const [invitees, setInvitees] = useState('');

    const handleClose = (): void => {
        setInvitees('');
        close();
    };

    const escalate = (event: React.FormEvent<HTMLFormElement>): void => {
        event.preventDefault();

        const uris = invitees
            .split(',')
            .map((item) => item.trim())
            .filter((item) => item !== '')
            .map((item) => (item.includes('@') ? item : `${item}@${config.defaultDomain}`));

        uris.push(call.remoteIdentity.uri);

        escalateToConference(uris);
        setInvitees('');
    };

    return (
        <Dialog
            open={show}
            onClose={handleClose}
            maxWidth="sm"
            fullWidth={true}
            aria-labelledby="escalate-dialog-title"
        >
            <DialogTitle id="escalate-dialog-title" className={classes.bigger}>
                Move to conference
                <IconButton aria-label="close" className={classes.closeButton} onClick={handleClose}>
                    <i className="fa fa-times" />
                </IconButton>
            </DialogTitle>
            <form onSubmit={escalate}>
                <DialogContent dividers>
                    <p className="lead" style={{fontSize: 16}}>
                        Press Move to turn this call into a conference. You can optionally enter
                        the account(s) you wish to invite now, or leave the field empty and
                        invite people later.
                    </p>
                    <label htmlFor="inputTarget" className="sr-only">Invitees (optional)</label>
                    <div className="input-group">
                        <span className="input-group-addon"><i className="fa fa-user-plus fa-fw"></i></span>
                        <input
                            id="inputTarget"
                            className="form-control"
                            placeholder="Optional: alice@sip2sip.info,bob,carol"
                            value={invitees}
                            onChange={(e) => setInvitees(e.target.value)}
                            autoFocus
                        />
                    </div>
                </DialogContent>
                <DialogActions>
                    <button type="submit" className="btn btn-success">
                        <i className="fa fa-paper-plane-o"></i> Move
                    </button>
                </DialogActions>
            </form>
        </Dialog>
    );
};

export default EscalateConferenceModal;
