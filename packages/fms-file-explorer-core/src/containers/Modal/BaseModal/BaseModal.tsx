import { ContextualMenu, IconButton, IIconProps, IDragOptions, Modal } from "@fluentui/react";
import { noop } from "lodash";
import * as React from "react";

const styles = require("./BaseModal.module.css");

interface BaseModalProps {
    body: React.ReactNode;
    footer?: React.ReactNode;
    isModeless?: boolean;
    onDismiss?: () => void;
    title?: string;
}

const DRAG_OPTIONS: IDragOptions = {
    moveMenuItemText: "Move",
    closeMenuItemText: "Close",
    menu: ContextualMenu,
};
const CANCEL_ICON: IIconProps = { iconName: "Cancel" };
const ICON_STYLES = {
    root: {
        color: "black",
    },
};

/**
 * Wrapper around @fluent-ui/react Modal with consistent defaults applied and some layout scaffolding
 * for plugging content into.
 */
export default function BaseModal(props: BaseModalProps) {
    const { body, footer, isModeless, title, onDismiss } = props;

    const titleId = "base-modal-title";
    return (
        <Modal
            containerClassName={styles.container}
            dragOptions={DRAG_OPTIONS}
            isModeless={isModeless}
            isOpen={true}
            scrollableContentClassName={styles.scrollableContainer}
            titleAriaId={titleId}
        >
            <div className={styles.header}>
                {title ? (
                    <h3 className={styles.title} id={titleId}>
                        {title}
                    </h3>
                ) : null}
                <IconButton
                    ariaLabel="Close"
                    className={styles.closeButton}
                    iconProps={CANCEL_ICON}
                    onClick={onDismiss}
                    styles={ICON_STYLES}
                />
            </div>
            {body}
            <div className={styles.footer}>{footer}</div>
        </Modal>
    );
}

BaseModal.defaultProps = {
    footer: null,
    onDismiss: noop,
};
