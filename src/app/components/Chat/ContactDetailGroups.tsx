import React, { useMemo, useState } from 'react';
import { Chip, Divider, Paper, TextField } from '@material-ui/core';
import { makeStyles, Theme } from '@material-ui/core/styles';
import { Check, Lock } from '@material-ui/icons';

import { contactGroups, rules as addressbookRules } from 'blink-addressbook';
import type { ContactGroup } from 'blink-addressbook';

// The groups of the contact being edited: keys of existing groups, and names
// of groups to create. Locked groups are never in here -- the editor shows
// them but does not change them.
export interface GroupsForm {
    keys: string[];
    newNames: string[];
}

interface ContactDetailGroupsProps {
    contactId: string;
    groups: ContactGroup[];
    editContact: boolean;
    value: GroupsForm;
    onChange: (value: GroupsForm) => void;
}

const useStyles = makeStyles((theme: Theme) => ({
    root: {
        margin: theme.spacing(0, 1, 2.5)
    },
    paperRoot: {
        paddingTop: theme.spacing(.5),
        paddingBottom: theme.spacing(1),
        '& > div': {
            margin: theme.spacing(1)
        }
    },
    label: {
        margin: theme.spacing(1),
        fontSize: 12,
        color: 'rgba(0, 0, 0, 0.54)'
    },
    chips: {
        display: 'flex',
        flexWrap: 'wrap',
        gap: theme.spacing(0.75),
        paddingBottom: theme.spacing(.5),

        '& .MuiChip-root': {
            fontFamily: 'inherit',
            fontSize: 13
        },
        '& .MuiChip-label': { lineHeight: 1.3 }

    },
    selected: {
        backgroundColor: '#436294',
        color: '#fff',
        '&:hover, &:focus': { backgroundColor: '#3a5580' },
        '& .MuiChip-icon': { color: '#fff' }
    },
    locked: {
        opacity: 0.8
    },
    input: {
        marginTop: '16px !important',
        '& input': {
            fontSize: 16,
            padding: 0
        }
    },
    helperText: {
        fontSize: 12,
        fontFamily: 'inherit'
    }
}));

export const groupsOf = (groups: ContactGroup[], contactId: string): GroupsForm => ({
    keys: groups.filter(g => !contactGroups.isLocked(g.key) && g.members.has(contactId)).map(g => g.key),
    newNames: []
});

export const groupsChanged = (a: GroupsForm, b: GroupsForm) =>
    a.newNames.length !== b.newNames.length
    || [...a.keys].sort().join('\n') !== [...b.keys].sort().join('\n');

const ContactDetailGroups = ({ contactId, groups, editContact, value, onChange }: ContactDetailGroupsProps) => {
    const classes = useStyles();
    const [draft, setDraft] = useState('');
    const [hint, setHint] = useState('');

    // Locked groups the contact is in, and every group the user may pick:
    // the account's own, Favorites and Blocked even before they exist.
    const { locked, editable } = useMemo(() => {
        const lockedIn = groups.filter(g => contactGroups.isLocked(g.key) && g.members.has(contactId));
        const options = groups
            .filter(g => !contactGroups.isLocked(g.key))
            .map(g => ({ key: g.key, name: g.name }));
        for (const key of contactGroups.ALWAYS_OFFERED) {
            if (!options.some(o => o.key === key)) {
                options.push({ key, name: contactGroups.titleForKey(key) });
            }
        }
        return { locked: lockedIn, editable: options };
    }, [groups, contactId]);

    const selected = new Set(value.keys);

    const toggle = (key: string) => {
        const keys = selected.has(key) ? value.keys.filter(k => k !== key) : [...value.keys, key];
        onChange({ ...value, keys });
    };

    const addDraft = () => {
        const name = contactGroups.sanitizeName(draft);
        if (!name) return;
        const key = contactGroups.keyForName(name);
        if (contactGroups.isLocked(key)) {
            setHint(`${contactGroups.titleForKey(key)} is filled automatically`);
            return;
        }
        if (addressbookRules.isPurgeGroup(name)) {
            setHint('That name is reserved');
            return;
        }
        setDraft('');
        setHint('');
        if (editable.some(o => o.key === key)) {
            if (!selected.has(key)) onChange({ ...value, keys: [...value.keys, key] });
            return;
        }
        if (value.newNames.some(n => contactGroups.keyForName(n) === key)) return;
        onChange({ ...value, newNames: [...value.newNames, name] });
    };

    if (!editContact) {
        const member = groups.filter(g => g.members.has(contactId));
        if (!member.length) return null;
        return (
            <div className={classes.root}>
                <div className={classes.label}>Groups</div>
                <div className={classes.chips}>
                    {member.map(g => (
                        <Chip key={g.key} size="small" variant="outlined" label={g.name} />
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className={classes.root}>
            <div className={classes.label}>Groups</div>
            <Paper elevation={0} className={classes.paperRoot}>
                <div className={classes.chips}>
                    {editable.map(o => {
                        const on = selected.has(o.key);
                        return (
                            <Chip
                                key={o.key}
                                size="small"
                                clickable
                                className={on ? classes.selected : undefined}
                                variant={on ? 'default' : 'outlined'}
                                icon={on ? <Check /> : undefined}
                                label={o.name}
                                onClick={() => toggle(o.key)}
                            />
                        );
                    })}
                    {value.newNames.map(name => (
                        <Chip
                            key={`new-${name}`}
                            size="small"
                            className={classes.selected}
                            icon={<Check />}
                            label={`${name} (new)`}
                            onDelete={() => onChange({ ...value, newNames: value.newNames.filter(n => n !== name) })}
                        />
                    ))}
                    {locked.map(g => (
                        <Chip
                            key={g.key}
                            size="small"
                            variant="outlined"
                            className={classes.locked}
                            icon={<Lock />}
                            label={g.name}
                            title="Filled automatically"
                        />
                    ))}
                </div>
                <Divider />
                <TextField
                    className={classes.input}
                    placeholder="Add group"
                    value={draft}
                    onChange={(e) => { setDraft(e.target.value); setHint(''); }}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                            e.preventDefault();
                            e.stopPropagation();
                            addDraft();
                        }
                    }}
                    onBlur={addDraft}
                    helperText={hint}
                    FormHelperTextProps={{ classes: { root: classes.helperText } }}
                    InputProps={{disableUnderline: true}}
                    inputProps={{
                        maxLength: 40
                    }}
                    fullWidth
                />
            </Paper>
        </div>
    );
};

export default ContactDetailGroups;
