import { Icon, Spinner } from "@fluentui/react";
import * as React from "react";

import styles from "./ComputePipelineModal.module.css";

const MAX_VISIBLE_FILE_PATHS = 10;

interface SelectedFilesExpanderProps {
    count: number;
    onExpand: () => Promise<string[]>;
}

export default function SelectedFilesExpander({ count, onExpand }: SelectedFilesExpanderProps) {
    const [expanded, setExpanded] = React.useState(false);
    const [paths, setPaths] = React.useState<string[] | null>(null);
    const [loading, setLoading] = React.useState(false);

    const toggle = async () => {
        if (!expanded && paths === null) {
            setLoading(true);
            const fetched = await onExpand();
            setPaths(fetched);
            setLoading(false);
        }
        setExpanded((e) => !e);
    };

    return (
        <div className={styles.expander}>
            <div className={styles.expanderHeader} onClick={toggle}>
                <span className={styles.expanderHeaderLeft}>
                    <Icon iconName="FolderOpen" />
                    {count} selected file{count !== 1 ? "s" : ""}
                </span>
                {loading ? <Spinner /> : <Icon iconName={expanded ? "ChevronUp" : "ChevronDown"} />}
            </div>
            {expanded && paths !== null && (
                <div className={styles.expanderBody}>
                    <div className={styles.expanderNote}>
                        Files are added automatically from your current selection.
                    </div>
                    <ul className={styles.filePathList}>
                        {paths.slice(0, MAX_VISIBLE_FILE_PATHS).map((p) => (
                            <li key={p} className={styles.filePathItem}>
                                <Icon iconName="TextDocument" />
                                {p}
                            </li>
                        ))}
                    </ul>
                    {paths.length > MAX_VISIBLE_FILE_PATHS && (
                        <div className={styles.expanderNote}>
                            …and {paths.length - MAX_VISIBLE_FILE_PATHS} more
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
