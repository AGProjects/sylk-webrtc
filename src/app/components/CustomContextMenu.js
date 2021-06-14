'use strict';

const React = require('react');
const PropTypes = require('prop-types');

const { makeStyles } = require('@material-ui/core/styles');
const { Popper, MenuList, Paper } = require('@material-ui/core');
const { ClickAwayListener, Fade } = require('@material-ui/core');


/* copied from https://github.com/mui-org/material-ui/blob/v4.3.2/packages/material-ui/src/Menu/Menu.js#L21 */
const useMenuStyles = makeStyles({
    /* Styles applied to the `Paper` component. */
    paper: {
        // specZ: The maximum height of a simple menu should be one or more rows less than the view
        // height. This ensures a tapable area outside of the simple menu with which to dismiss
        // the menu.
        maxHeight: 'calc(100% - 96px)',
        // Add iOS momentum scrolling.
        WebkitOverflowScrolling: 'touch'
    },
    /* Styles applied to the `List` component via `MenuList`. */
    list: {
        // We disable the focus ring for mouse, touch and keyboard users.
        outline: 0
    }
});

const CustomContentMenu = ({anchorEl, open, children, onClose, keepMounted}) => {
    const menuClasses = useMenuStyles();
    const id = open ? 'faked-reference-popper' : undefined;

    return (
        <Popper
            style={{zIndex: 1201}}
            id={id}
            open={open}
            anchorEl={anchorEl || null }
            transition
            placement="bottom-start"
            keepMounted={keepMounted}
        >
        {({ TransitionProps }) => (
          <ClickAwayListener mouseEvent="onMouseDown" onClickAway={onClose}>
            <Fade {...TransitionProps}>
              <Paper className={menuClasses.paper}>
                <MenuList className={menuClasses.list} autoFocus>
                    {children}
                </MenuList>
              </Paper>
            </Fade>
          </ClickAwayListener>
        )}
      </Popper>
  );
}

CustomContentMenu.propTypes = {
    anchorEl    : PropTypes.object,
    open        : PropTypes.bool.isRequired,
    children    : PropTypes.node.isRequired,
    onClose     : PropTypes.func.isRequired,
    keepMounted : PropTypes.bool
};


module.exports = CustomContentMenu
