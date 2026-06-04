import { IContextualMenuItem } from "@fluentui/react";
import classNames from "classnames";
import { isNil, isObject } from "lodash";
import * as React from "react";
import { useDispatch, useSelector } from "react-redux";

import Section from "./Section";
import Value from "./Value";
import useDisplayText from "./useDisplayText";
import FileDetail from "../../../entity/FileDetail";
import Cell from "../../FileRow/Cell";
import { MetadataValue, NestedMetadataValue } from "../../../services/FileService";
import { interaction, metadata, selection } from "../../../state";

import styles from "./Row.module.css";


interface Props {
    name: string;
    value: MetadataValue;
    file: FileDetail;
    /** Current nesting depth, used to drive left-padding on children. */
    depth: number;
}

/**
 * Renders a primitive or nested column (array-of-objects column value) as a
 * collapsible group.
 * Supports any depth of nesting.
 * 
 * Combined within this file for circular dependency reasons since Row needs to use Section
 */
export default function Row(props: Props) {
    const dispatch = useDispatch();
    const shouldDisplaySmallFont = useSelector(selection.selectors.getShouldDisplaySmallFont);
    const annotationNameToAnnotationMap = useSelector(
        metadata.selectors.getAnnotationNameToAnnotationMap
    );
    
    // For groups, represents whether this metadata field is currently
    // expanded to show its children or collapsed to hide them.
    // For individual rows, represents whether the value is expanded to show
    // the full string or collapsed to show a truncated summary.
    const [isTextValueExpanded, setIsTextValueExpanded] = React.useState(false);

    // TODO: Change this data model to avoid explicit isObject check
    // If the value is an array of objects, treat it as nested metadata and
    // render child rows for each object in the array.
    const childRows = (!isNil(props.value[0]) && isObject(props.value[0]))
        ? (props.value as NestedMetadataValue[])
        : [];

    const annotation = annotationNameToAnnotationMap.get(props.name);
    const { text, emphasize: emphasizeText } = useDisplayText(props.file, props.name, props.value, annotation, childRows);
    if (text === null) {
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

            const contextMenuItems: IContextualMenuItem[] = [{
                key: "copy",
                text: "Copy",
                title: "Copy to clipboard",
                iconProps: { iconName: "Copy" },
                onClick: () => {
                    navigator.clipboard.writeText(clipboardText);
                },
            }];

            // If rendering a long value, show expand/collapse options for the value.
            if (isLongValue) {
                if (isTextValueExpanded) {
                    contextMenuItems.push({
                        key: "collapse",
                        text: "Collapse",
                        title: "Collapse metadata field",
                        iconProps: { iconName: "CollapseContent" },
                        onClick: () => {
                            setIsTextValueExpanded(false);
                        },
                    });
                } else {
                    contextMenuItems.push({
                        key: "expand",
                        text: "Expand",
                        title: "Expand metadata field",
                        iconProps: { iconName: "ExploreContent" },
                        onClick: () => {
                            setIsTextValueExpanded(true);
                        },
                    });
                }
            }

            dispatch(interaction.actions.showContextMenu(contextMenuItems, evt.nativeEvent));
        };
    }

    const thisRow = (
        <div className={styles.row}>
            <Cell
                className={classNames(styles.cell, styles.key, {
                    [styles.smallFont]: shouldDisplaySmallFont,
                })}
                columnKey="key"
                width={1}
                title={annotation?.description}
            >
                <span
                    className={styles.keyValue}
                    onContextMenu={onContextMenuHandlerFactory(props.name)}
                    style={{ paddingLeft: `calc(${props.depth} * 18px)` }}
                >
                    {annotation?.displayName ?? props.name}
                </span>
            </Cell>
            <Cell
                className={classNames(styles.cell, styles.value, {
                    [styles.smallFont]: shouldDisplaySmallFont,
                })}
                columnKey="value"
                width={1}
            >
                <Value
                    annotation={annotation}
                    value={text}
                    emphasize={emphasizeText}
                    isExpanded={isTextValueExpanded}
                    isLongValue={isLongValue}
                    setIsExpanded={setIsTextValueExpanded}
                    onContextMenu={onContextMenuHandlerFactory(text)}
                />
            </Cell>
        </div>
    )

    return (
        <Section
            row={thisRow}
            childRows={childRows}
            rowClassName={styles.rowContainer}
        >
            {(rowProps) => (
                <Row {...rowProps} file={props.file} depth={props.depth + 1}/>
            )}
        </Section>
    );
}
