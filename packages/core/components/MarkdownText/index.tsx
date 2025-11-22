import classNames from "classnames";
import Markdown from "markdown-to-jsx";
import * as React from "react";

import styles from "./MarkdownText.module.css";


interface Props {
    className?: string;
    text?: string;
}

/**
 * Render the given text aa markdown component
 */
export default function MarkdownText(props: Props) {
    return (
        <Markdown
            className={classNames(styles.markdown, props.className)}
            options={{
                overrides: {
                    a: {
                        props: {
                            target: "_blank",
                            rel: "noopener noreferrer",
                        },
                    },
                },
            }}
        >
            {props.text}
        </Markdown>
    )
}
