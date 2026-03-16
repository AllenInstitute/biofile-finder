import { Icon } from "@fluentui/react";
import classNames from "classnames";
import * as React from "react";
import { useDispatch, useSelector } from "react-redux";

import FileAnnotationRow from "./FileAnnotationRow";
import Tooltip from "../Tooltip";
import Cell from "../../components/FileRow/Cell";
import { NestedAnnotation, NestedAnnotationValue } from "../../services/FileService";
import { interaction, metadata, selection } from "../../state";

import styles from "./FileAnnotationRowGroup.module.css";

interface Props {
    className?: string;
    name: string;
    value: NestedAnnotation;
    fmsStateIndicator?: boolean;
    style?: React.CSSProperties;
    /** Current nesting depth, used to drive left-padding on children. */
    depth: number;
}

const INDENT_EM = 0.75;

/**
 * Renders a nested annotation (JSON object column value) as a collapsible group.
 * Recurses into child objects, so any depth of nesting is handled naturally.
 * Designed to work with VARCHAR columns whose values are JSON strings, giving
 * each row complete freedom to use different keys and nesting shapes.
 */
export default function FileAnnotationRowGroup(props: Props) {
    const dispatch = useDispatch();
    const shouldDisplaySmallFont = useSelector(selection.selectors.getShouldDisplaySmallFont);
    const annotationNameToAnnotationMap = useSelector(
        metadata.selectors.getAnnotationNameToAnnotationMap
    );

    const annotation = annotationNameToAnnotationMap[props.name];
    const [isExpanded, setIsExpanded] = React.useState(false);

    const topLevelKeys = Object.keys(props.value);
    const summary = topLevelKeys.join(", ");

    const onContextMenu = (evt: React.MouseEvent) => {
        evt.preventDefault();
        dispatch(
            interaction.actions.showContextMenu(
                [
                    {
                        key: "copy",
                        text: "Copy JSON",
                        title: "Copy value as JSON to clipboard",
                        iconProps: { iconName: "Copy" },
                        onClick: () => {
                            navigator.clipboard.writeText(JSON.stringify(props.value, null, 2));
                        },
                    },
                    {
                        key: isExpanded ? "collapse" : "expand",
                        text: isExpanded ? "Collapse" : "Expand",
                        title: isExpanded ? "Collapse nested fields" : "Expand nested fields",
                        iconProps: {
                            iconName: isExpanded ? "CollapseContent" : "ExploreContent",
                        },
                        onClick: () => setIsExpanded(!isExpanded),
                    },
                ],
                evt.nativeEvent
            )
        );
    };

    return (
        <>
            {/* Header row */}
            <div
                className={classNames(props.className, styles.row)}
                style={props.style}
                onContextMenu={onContextMenu}
            >
                {Array.from({ length: props.depth }, (_, i) => (
                    <span
                        key={i}
                        className={styles.indent}
                        style={{
                            marginRight: `calc(${INDENT_EM / 2}em)`,
                        }}
                    />
                ))}
                <Cell
                    className={classNames(styles.cell, styles.key, {
                        [styles.smallFont]: shouldDisplaySmallFont,
                    })}
                    columnKey="key"
                    width={1}
                    title={annotation?.description}
                >
                    <span style={{ userSelect: "text" }}>{props.name}</span>
                </Cell>
                <Cell
                    className={classNames(styles.cell, styles.value, {
                        [styles.smallFont]: shouldDisplaySmallFont,
                        [styles.fmsStateIndicator]: props.fmsStateIndicator,
                    })}
                    columnKey="value"
                    width={1}
                >
                    {!isExpanded && (
                        <span style={{ userSelect: "text" }} title={summary}>
                            {summary}
                        </span>
                    )}
                    <div className={styles.expandButtonWrapper}>
                        <Tooltip
                            content={isExpanded ? "Collapse nested fields" : "Expand nested fields"}
                        >
                            <Icon
                                className={styles.expandButton}
                                iconName={isExpanded ? "ChevronUpSmall" : "ChevronDownSmall"}
                                data-testid={
                                    isExpanded ? "collapse-nested-fields" : "expand-nested-fields"
                                }
                                onClick={() => setIsExpanded(!isExpanded)}
                            />
                        </Tooltip>
                    </div>
                </Cell>
            </div>

            {/* Expanded children */}
            {isExpanded &&
                topLevelKeys.map((key) =>
                    renderNestedValue(
                        key,
                        props.value[key],
                        props.depth + 1,
                        props.fmsStateIndicator
                    )
                )}
        </>
    );
}

/**
 * Renders a single nested key/value pair.
 * - Primitive values → FileAnnotationRow
 * - Object values → FileAnnotationRowGroup (recursive)
 */
function renderNestedValue(
    key: string,
    value: NestedAnnotationValue,
    depth: number,
    fmsStateIndicator?: boolean
): React.ReactElement {
    const indent = `${INDENT_EM / 2}em * ${depth}`;
    const indentStyle = {
        marginLeft: `calc(${indent})`,
        paddingLeft: `calc(${indent})`,
        width: `calc(100% - ${indent})`,
    };

    if (typeof value === "object" && value !== null) {
        return (
            <FileAnnotationRowGroup
                key={key}
                className={classNames(styles.row, styles.nestedRow)}
                name={key}
                value={value as NestedAnnotation}
                fmsStateIndicator={fmsStateIndicator}
                depth={depth}
                // style={indentStyle}
            />
        );
    }

    return (
        <FileAnnotationRow
            key={key}
            className={classNames(styles.row, styles.nestedRow)}
            name={key}
            value={value === null ? "" : String(value)}
            fmsStateIndicator={fmsStateIndicator}
            depth={depth}
            // style={indentStyle}
        />
    );
}
