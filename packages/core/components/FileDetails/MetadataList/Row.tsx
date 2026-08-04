import { IContextualMenuItem } from "@fluentui/react";
import classNames from "classnames";
import { isNil, isObject } from "lodash";
import * as React from "react";
import { useDispatch, useSelector } from "react-redux";

import Section from "./Section";
import Value from "./Value";
import useDisplayText from "./useDisplayText";
import Cell from "../../FileRow/Cell";
import FileDetail from "../../../entity/FileDetail";
import { MetadataValue, NestedMetadataValue } from "../../../services/FileService";
import { interaction, metadata, selection } from "../../../state";

import styles from "./Row.module.css";

interface Props {
    name: string;
    value: MetadataValue;
    file: FileDetail;
    /** Current nesting depth, used to drive left-padding on children. */
    depth: number;
    parents: string[]; // Used to track the path of parent keys for this row
    isSectionCollapsed: (key: string) => boolean;
    toggleSection: (key: string) => void;
}

/**
 * Renders a primitive or nested column (array-of-objects column value) as a
 * collapsible group.
 * Supports any depth of nesting.
 */
export default function Row(props: Props) {
    const dispatch = useDispatch();
    const shouldDisplaySmallFont = useSelector(selection.selectors.getShouldDisplaySmallFont);
    const annotationNameToAnnotationMap = useSelector(
        metadata.selectors.getAnnotationNameToAnnotationMap
    );

    const [isTextValueCollapsed, setIsTextValueCollapsed] = React.useState(true);

    // TODO: Change this data model to avoid explicit isObject check
    // If the value is an array of objects, treat it as nested metadata and
    // render child rows for each object in the array.
    const childRows =
        !isNil(props.value[0]) && isObject(props.value[0])
            ? (props.value as NestedMetadataValue[])
            : [];

    const path = [...props.parents, props.name];
    const annotation = annotationNameToAnnotationMap.get(path.join("."));
    const { text, emphasize: emphasizeText } = useDisplayText(
        props.file,
        annotation,
        props.value,
        childRows
    );

    const pathLabel = path.join(" : ");
    React.useEffect(() => {
        if (!annotation) {
            dispatch(
                interaction.actions.processError(
                    `<Row />-${pathLabel}`,
                    `Unexpected internal error. Unable to find column metadata for field "${pathLabel}". Omitting this field from display.`
                )
            );
        }
    }, [annotation, pathLabel, dispatch]);

    if (!annotation || text === null) {
        // Don't render anything for this metadata field (e.g. if it's still loading or if there is no value to show)
        return null;
    }

    // Character length approximately exceeds 4 lines of text
    const isLongValue = text.length > 160;

    // Creates a callback based on the given text to copy that text to clipboard
    // and show a context menu with that option (and optionally expand/collapse options
    // if this group has nested values or a long value)
    const onContextMenuHandlerFactory = (clipboardText: string) => {
        return (evt: React.MouseEvent) => {
            evt.preventDefault();

            const contextMenuItems: IContextualMenuItem[] = [
                {
                    key: "copy",
                    text: "Copy",
                    title: "Copy to clipboard",
                    iconProps: { iconName: "Copy" },
                    onClick: () => {
                        navigator.clipboard.writeText(clipboardText);
                    },
                },
            ];

            // If rendering a long value, show expand/collapse options for the value.
            if (isLongValue) {
                if (isTextValueCollapsed) {
                    contextMenuItems.push({
                        key: "expand",
                        text: "Expand",
                        title: "Expand metadata field",
                        iconProps: { iconName: "ExploreContent" },
                        onClick: () => {
                            setIsTextValueCollapsed(false);
                        },
                    });
                } else {
                    contextMenuItems.push({
                        key: "collapse",
                        text: "Collapse",
                        title: "Collapse metadata field",
                        iconProps: { iconName: "CollapseContent" },
                        onClick: () => {
                            setIsTextValueCollapsed(true);
                        },
                    });
                }
            }

            dispatch(interaction.actions.showContextMenu(contextMenuItems, evt.nativeEvent));
        };
    };

    const thisRow = (
        <div className={styles.row}>
            <Cell
                className={classNames(styles.cell, styles.key, {
                    [styles.smallFont]: shouldDisplaySmallFont,
                })}
                columnKey="key"
                title={
                    annotation.description
                        ? `${annotation.leafDisplayName}: ${annotation.description}`
                        : annotation.leafDisplayName
                }
            >
                <span
                    className={styles.keyValue}
                    onContextMenu={onContextMenuHandlerFactory(annotation.leafDisplayName)}
                    style={{ paddingLeft: `calc(${props.depth} * 18px)` }}
                >
                    {annotation.leafDisplayName}
                </span>
            </Cell>
            <Cell
                className={classNames(styles.cell, styles.value, {
                    [styles.smallFont]: shouldDisplaySmallFont,
                })}
                columnKey="value"
            >
                <Value
                    annotation={annotation}
                    value={text}
                    emphasize={emphasizeText}
                    isCollapsed={isTextValueCollapsed}
                    isLongValue={isLongValue}
                    setIsCollapsed={setIsTextValueCollapsed}
                    onContextMenu={onContextMenuHandlerFactory(text)}
                />
            </Cell>
        </div>
    );

    const sectionParents = [...props.parents, props.name];
    const sectionKey = sectionParents.join(".");
    return (
        <Section
            row={thisRow}
            childRows={childRows}
            rowClassName={styles.rowContainer}
            isCollapsed={props.isSectionCollapsed(sectionKey)}
            onToggle={() => props.toggleSection(sectionKey)}
            entryLabel={annotation.leafDisplayName}
        >
            {(rowProps) => (
                <Row
                    {...rowProps}
                    file={props.file}
                    depth={props.depth + 1}
                    parents={sectionParents}
                    isSectionCollapsed={props.isSectionCollapsed}
                    toggleSection={props.toggleSection}
                />
            )}
        </Section>
    );
}
