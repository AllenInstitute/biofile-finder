import classNames from "classnames";
import * as React from "react";

import ContentLengthToggle from "./ContentLengthToggle";
import MarkdownText from "../../MarkdownText";
import Annotation from "../../../entity/Annotation";

import styles from "./Value.module.css";

interface Props {
    annotation: Annotation | undefined;
    value: string;
    emphasize?: boolean;
    isExpanded: boolean;
    isLongValue: boolean;
    setIsExpanded: (isExpanded: boolean) => void;
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
    if (props.annotation?.isOpenFileLink) {
        content = (
            <a className={styles.link} href={props.value} rel="noreferrer" target="_blank">
                View link
            </a>
        );
    } else if (props.annotation?.isMarkdown) {
        content = (
            <MarkdownText
                className={classNames({
                    [styles.valueTruncated]: !props.isExpanded && props.isLongValue,
                })}
                text={props.value}
            />
        );
    } else {
        content = (
            <div
                className={classNames({
                    [styles.valueTruncated]: !props.isExpanded && props.isLongValue,
                })}
            >
                {props.emphasize ? <i>{props.value}</i> : props.value}
            </div>
        );
    }

    return (
        <span onContextMenu={props.onContextMenu}>
            {content}
            {props.isLongValue && (
                <ContentLengthToggle
                    isExpanded={props.isExpanded}
                    setIsExpanded={props.setIsExpanded}
                    tooltip={props.isExpanded ? "Collapse text" : "Expand text"}
                />
            )}
        </span>
    );
}
