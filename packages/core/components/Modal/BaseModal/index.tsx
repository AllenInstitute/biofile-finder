import { Modal } from "@fluentui/react";
import classNames from "classnames";
import { noop } from "lodash";
import * as React from "react";

import { TertiaryButton } from "../../Buttons";
import useCheckOverflowScroll from "../../../hooks/useCheckOverflowScroll";

import styles from "./BaseModal.module.css";

interface BaseModalProps {
    body: React.ReactNode;
    className?: string;
    footer?: React.ReactNode;
    onDismiss?: () => void;
    title?: string;
    isStatic?: boolean; // Not draggable
}

/**
 * Wrapper around @fluent-ui/react Modal with consistent defaults applied and some layout scaffolding
 * for plugging content into.
 */
export default function BaseModal(props: BaseModalProps) {
    const { body, className, footer, title, onDismiss } = props;
    const [scrollRef, hasScroll] = useCheckOverflowScroll<HTMLDivElement>([body]);

    const titleId = "base-modal-title";
    return (
        <Modal
            isOpen
            onDismiss={onDismiss}
            containerClassName={classNames(styles.container, className)}
            titleAriaId={titleId}
            overlay={{ className: styles.overlay }}
            scrollableContentClassName={styles.scrollableContainer}
        >
            <div className={styles.header}>
                {title ? (
                    <h2 className={styles.title} id={titleId}>
                        {title}
                    </h2>
                ) : null}
                <TertiaryButton iconName="Cancel" onClick={onDismiss} title="" />
            </div>
            <div className={styles.bodyWrapper}>
                <div className={styles.scrollableBody} ref={scrollRef}>
                    {body}
                </div>
                {hasScroll && <div className={styles.verticalGradient} />}
            </div>
            <div className={styles.footer}>{footer}</div>
        </Modal>
    );
}

BaseModal.defaultProps = {
    footer: null,
    onDismiss: noop,
    isStatic: false,
};
