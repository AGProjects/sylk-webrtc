import React from 'react';

import { makeStyles } from '@material-ui/core/styles';
import { Divider, Tab, Tabs } from '@material-ui/core';
import clsx from 'clsx';


const ICONS = {
    all: 'fa-users',
    messages: 'fa-comment',
    calls: 'fa-phone',
    favorites: 'fa-star',
    tel: 'fa-th',
    missed: 'fa-phone-square',
    blocked: 'fa-ban',
    conference: 'fa-video-camera',
    family: 'fa-child',
    families: 'fa-child',
    kids: 'fa-child',
    home: 'fa-home',
    friend: 'fa-smile-o',
    friends: 'fa-smile-o',
    buddies: 'fa-smile-o',
    work: 'fa-briefcase',
    works: 'fa-briefcase',
    job: 'fa-briefcase',
    office: 'fa-briefcase',
    colleague: 'fa-id-badge',
    colleagues: 'fa-id-badge',
    team: 'fa-sitemap',
    email: 'fa-envelope',
    emails: 'fa-envelope',
    mail: 'fa-envelope',
    business: 'fa-building',
    company: 'fa-building',
    client: 'fa-handshake-o',
    clients: 'fa-handshake-o',
    school: 'fa-graduation-cap',
    vip: 'fa-diamond'
};

const iconFor = (group) => {
    return ICONS[group.key] || ICONS[group.name.toLowerCase()] || 'fa-tag';
};

const styleSheet = makeStyles({
    bar: {
        flexShrink: 0,
        margin: '0 -15px -15px',
        position: 'relative',
        zIndex: 1,
        backgroundColor: '#fff'
    },
    icon: {
        width: 40,
        height: 26,
        lineHeight: '26px !important',
        borderRadius: 13,
        fontSize: '16px !important',
        textAlign: 'center'
    },
    item: {
        fontFamily: 'inherit',
        minWidth: 56,
        maxWidth: 'none',
        width: 'auto',
        paddingTop: 6,
        paddingBottom: 6,
        flex: '0 0 auto',
        transition: 'background-color 150ms ease',
        minHeight: 61,

        '&:hover': {
            backgroundColor: '#f5f6f8'
        }
    },
    selected: {
        fontFamily: 'inherit',
        color: '#436294'
    },
    tabbar: {
        paddingLeft: '6px',
        paddingRight: '6px',
         '& .MuiTabScrollButton-root.Mui-disabled': { display: 'none' }
    }
});

interface GroupProps {
    key: string;
    name: string;
    count?: number;
}

interface ContactGroupsBarProps {
    groups: GroupProps[];
    total: number;
    selected: string | null;
    onSelect: (value: string | null) => void;
}

const ContactGroupsBar = ({ groups, total, selected, onSelect }: ContactGroupsBarProps) => {
    const classes = styleSheet();

    if (!groups.length) {
        return null;
    }

    const items = [
        { key: 'all', name: total > 0 ? `All ${total}` : 'All', count: total },
        ...groups
    ];

    return (
        <div className={classes.bar}>
            <Divider />
            <Tabs
                value={selected ?? false}
                onChange={(event, newValue) => { onSelect(newValue === selected ? null : newValue); }}
                TabIndicatorProps={{
                    style: { display: 'none' }
                }}
                variant="scrollable"
                className={classes.tabbar}
            >
                {items.map((item) => (
                    <Tab
                        key={item.key}
                        value={item.key}
                        label={item.name}
                        icon={<i className={clsx('fa', iconFor(item),classes.icon)} />}
                        classes={{
                            root: classes.item,
                            selected: classes.selected
                        }}
                    />
                ))}
            </Tabs>
        </div>
    );
};

export default ContactGroupsBar;
