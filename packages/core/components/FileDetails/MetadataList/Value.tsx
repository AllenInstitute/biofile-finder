import classNames from "classnames";
import * as React from "react";

import ContentLengthToggle from "./ContentLengthToggle";
import MarkdownText from "../../MarkdownText";
import Annotation from "../../../entity/Annotation";

import styles from "./Value.module.css";

interface Props {
    annotation: Annotation;
    value: string;
    emphasize?: boolean;
    isCollapsed: boolean;
    isLongValue: boolean;
    setIsCollapsed: (isCollapsed: boolean) => void;
    onContextMenu: (evt: React.MouseEvent) => void;
}

/**
 * Renders the value of a metadata annotation, which may be a long string or markdown text, and may have an associated link.
 * If the value is long, it will be truncated with an option to expand and view the full text.
 * If the value is markdown, it will be rendered as markdown.
 * If the value has an associated link, a "View link" anchor will be shown that opens the link in a new tab.
 */
export default function Value(props: Props) {
    let content: React.ReactNode;
    let { isLongValue } = props;
    if (props.annotation.isOpenFileLink) {
        // Override long value truncation for open file links, since the link is rendered separately.
        isLongValue = false;
        content = (
            <a className={styles.link} href={props.value} rel="noreferrer" target="_blank">
                View link
            </a>
        );
    } else if (props.annotation.isMarkdown) {
        content = (
            <MarkdownText
                className={classNames({
                    [styles.valueTruncated]: props.isCollapsed && isLongValue,
                })}
                text={props.value}
            />
        );
    } else {
        content = (
            <div
                className={classNames({
                    [styles.valueTruncated]: props.isCollapsed && isLongValue,
                })}
            >
                {props.emphasize ? <i>{props.value}</i> : props.value}
            </div>
        );
    }

    return (
        <div className={styles.container} onContextMenu={props.onContextMenu}>
            {content}
            {isLongValue && (
                <div className={styles.toggleContainer}>
                    <ContentLengthToggle
                        isCollapsed={props.isCollapsed}
                        setIsCollapsed={props.setIsCollapsed}
                        tooltip={props.isCollapsed ? "Expand text" : "Collapse text"}
                    />
                </div>
            )}
        </div>
    );
}
