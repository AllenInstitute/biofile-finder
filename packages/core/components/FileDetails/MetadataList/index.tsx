import { isEmpty, isObject } from "lodash";
import * as React from "react";

import Row from "./Row";
import Section from "./Section";
import AnnotationName from "../../../entity/Annotation/AnnotationName";
import FileDetail from "../../../entity/FileDetail";
import { NestedMetadataValue } from "../../../services/FileService";

import styles from "./MetadataList.module.css";


// Keys of annotations that should not be included the list
const EXCLUDED_KEYS = new Set([AnnotationName.FILE_NAME, "File Name"]);

interface Props {
    file: FileDetail | null;
    isLoading: boolean;
}

/**
 * Component responsible for rendering the metadata pertaining to a file inside the file
 * details pane on right hand side of the application.
 */
export default function MetadataList(props: Props) {
    const { file, isLoading } = props;

    // Group metadata fields into sections based on their annotation names. If a field's annotation name
    // doesn't fall into any predefined section, put it in an "uncategorized" section at the top.
    const content: JSX.Element | JSX.Element[] | null = React.useMemo(() => {
        if (isLoading) return <div>Loading...</div>;
        if (!file) return null;

        const uncategorizedSection: NestedMetadataValue = {};
        const keyToSectionMap: Record<string, NestedMetadataValue[]> = {};
        for (const [key, values] of file.metadata.entries()) {
            // Track uncategorized rows that don't fall into any of the predefined sections
            if (values.length < 1 || EXCLUDED_KEYS.has(key)) continue;
            if (isObject(values[0])) {
                keyToSectionMap[key] = values as NestedMetadataValue[];
            } else {
                uncategorizedSection[key] = values;
            }
        }

        // A file actively downloading to local (VAST) storage may not yet have a local-path
        // annotation. Surface a placeholder row so the "copying in progress" affordance shows;
        // useDisplayText renders the progress message regardless of this value.
        if (file.downloadInProgress && !(AnnotationName.LOCAL_FILE_PATH in uncategorizedSection)) {
            uncategorizedSection[AnnotationName.LOCAL_FILE_PATH] = [""];
        }
        const sections = Object.keys(keyToSectionMap).sort().map((sectionName) => (
            <Section
                key={sectionName}
                row={<h3 className={styles.sectionTitle}>{sectionName}</h3>}
                childRows={keyToSectionMap[sectionName]}
            >
                {(rowProps) => (
                    <Row {...rowProps} file={file} depth={0} />
                )}
            </Section>
        ));

        // If any annotations were not able to be categorized into sections,
        // show them at the top in a generic "Metadata" section.
        if (!isEmpty(uncategorizedSection)) {
            sections.unshift(
                <Section
                    key="uncategorized-metadata"
                    row={<h3 className={styles.sectionTitle}>Metadata</h3>}
                    childRows={[uncategorizedSection]}
                >
                    {(rowProps) => (
                        <Row {...rowProps} file={file} depth={0} />
                    )}
                </Section>
            );
        }

        return sections;
    }, [file, isLoading]);

    return <div className={styles.list}>{content}</div>;
}
