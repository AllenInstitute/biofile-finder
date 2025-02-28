import { ContextualMenu, IDragOptions, Modal } from "@fluentui/react";
import { noop } from "lodash";
import * as React from "react";

import { TertiaryButton } from "../../Buttons";

import styles from "./BaseModal.module.css";

interface BaseModalProps {
    body: React.ReactNode;
    footer?: React.ReactNode;
    onDismiss?: () => void;
    title?: string;
}

const DRAG_OPTIONS: IDragOptions = {
    moveMenuItemText: "Move",
    closeMenuItemText: "Close",
    menu: ContextualMenu,
};

/**
 * Wrapper around @fluent-ui/react Modal with consistent defaults applied and some layout scaffolding
 * for plugging content into.
 */
export default function BaseModal(props: BaseModalProps) {
    const { body, footer = null, title, onDismiss = noop } = props;

    const titleId = "base-modal-title";
    return (
        <Modal
            isOpen
            onDismiss={onDismiss}
            containerClassName={styles.container}
            dragOptions={DRAG_OPTIONS}
            titleAriaId={titleId}
            overlay={{ className: styles.overlay }}
        >
            <div className={styles.header}>
                {title ? (
                    <h2 className={styles.title} id={titleId}>
                        {title}
                    </h2>
                ) : null}
                <TertiaryButton iconName="Cancel" onClick={onDismiss} title="" />
            </div>
            <div className={styles.scrollableContent}>{body}</div>
            <div className={styles.footer}>{footer}</div>
        </Modal>
    );
}
