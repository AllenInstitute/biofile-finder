import * as React from "react";

import styles from "./MarkdownPreview.module.css";
import { ParsedFrontmatter } from "../../entity/MarkdownFrontMatter";

interface Props {
    mdFrontmatter?: ParsedFrontmatter;
}

export default function MarkdownPreview(props: Props) {
    const { mdFrontmatter } = props;
    if (!mdFrontmatter) {
        return (
            <div className={styles.mdMetadata}>
                <i>Unable to parse this markdown file. Please check the file or URL for errors.</i>
            </div>
        );
    }
    // semi-arbitrary shortening of markdown body
    const truncatedDescription =
        mdFrontmatter?.body?.length <= 100
            ? mdFrontmatter.body
            : mdFrontmatter.body.slice(0, 45) + "..." + mdFrontmatter.body.slice(-45);

    if (!mdFrontmatter.metadata) {
        return (
            <>
                <div className={styles.mdMetadata}>
                    <i>
                        Unable to parse metadata from this markdown file. If you expected to find
                        metadata, please check the front-matter for formatting errors.
                    </i>
                </div>
                {mdFrontmatter?.body && (
                    <div className={styles.mdMetadata}>
                        <i> Plain markdown: </i> {truncatedDescription}
                    </div>
                )}
            </>
        );
    }
    return (
        <div className={styles.mdMetadata}>
            <i>Parsed the following metadata from the selected markdown source:</i>
            <ul>
                {Object.entries(mdFrontmatter.metadata ?? []).map(([key, value]) => {
                    return (
                        <li key={key}>
                            <b>{key}:</b> {value?.toString()}
                        </li>
                    );
                })}
                {mdFrontmatter?.body && (
                    <li key="raw-description">
                        <b>description:</b> {truncatedDescription}
                    </li>
                )}
            </ul>
        </div>
    );
}
