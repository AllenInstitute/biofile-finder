import { Modal } from "@fluentui/react";
import classNames from "classnames";
import { noop } from "lodash";
import * as React from "react";

import styles from "./BaseModal.module.css";
import { TertiaryButton } from "../../Buttons";

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
    const bodyContainerRef = React.useRef<HTMLDivElement>(null);
    const [hasScroll, setHasScroll] = React.useState(false);

    React.useEffect(() => {
        const el = bodyContainerRef.current;
        if (!el) return;

        const checkScroll = () => {
            const isOverflowing = el.scrollHeight > el.clientHeight;
            // we've reached the end of the content if the distance scrolled
            // from the top (rounded up to account for sub-pixel differences)
            // is equal to the total content height
            const isAtBottom = Math.ceil(el.scrollTop) + el.clientHeight >= el.scrollHeight;
            setHasScroll(isOverflowing && !isAtBottom);
        };
        checkScroll();

        const observer = new ResizeObserver(checkScroll);
        observer.observe(el);
        el.addEventListener("scroll", checkScroll);
        return () => {
            observer.disconnect();
            el.removeEventListener("scroll", checkScroll);
        };
    }, [body]);

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
                <div className={styles.scrollableBody} ref={bodyContainerRef}>
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
