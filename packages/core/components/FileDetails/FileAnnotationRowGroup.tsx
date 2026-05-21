import { Icon } from "@fluentui/react";
import classNames from "classnames";
import * as React from "react";
import { Fragment } from "react";
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
    /** A single nested-object entry or an array of entries (JSON arrays-of-objects). */
    value: NestedAnnotation | NestedAnnotation[];
    fmsStateIndicator?: boolean;
    style?: React.CSSProperties;
    /** Current nesting depth, used to drive left-padding on children. */
    depth: number;
}

const INDENT_EM = 0.75;

/**
 * Renders a nested annotation (JSON object or array-of-objects column value) as a
 * collapsible group.  Supports any depth of nesting.
 */
export default function FileAnnotationRowGroup(props: Props) {
    const dispatch = useDispatch();
    const shouldDisplaySmallFont = useSelector(selection.selectors.getShouldDisplaySmallFont);
    const annotationNameToAnnotationMap = useSelector(
        metadata.selectors.getAnnotationNameToAnnotationMap
    );

    const annotation = annotationNameToAnnotationMap[props.name];
    const [isExpanded, setIsExpanded] = React.useState(false);

    const isArray = Array.isArray(props.value);

    // Build a short summary for the collapsed view.
    const summary = isArray
        ? `${(props.value as NestedAnnotation[]).length} entr${
              (props.value as NestedAnnotation[]).length === 1 ? "y" : "ies"
          }`
        : Object.keys(props.value as NestedAnnotation).join(", ");

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
        <div className={styles["group-wrapper"]}>
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
                (isArray
                    ? // Array of objects: render each element's fields, separated by a rule
                      (props.value as NestedAnnotation[]).map((entry, index) => (
                          <Fragment key={index}>
                              {Object.keys(entry).map((key) =>
                                  renderNestedValue(
                                      key,
                                      entry[key],
                                      props.depth + 1,
                                      props.fmsStateIndicator
                                  )
                              )}
                              {index < (props.value as NestedAnnotation[]).length - 1 && (
                                  <div className={styles["entry-separator"]} />
                              )}
                          </Fragment>
                      ))
                    : // Single object: render each key
                      Object.keys(props.value as NestedAnnotation).map((key) =>
                          renderNestedValue(
                              key,
                              (props.value as NestedAnnotation)[key],
                              props.depth + 1,
                              props.fmsStateIndicator
                          )
                      ))}
        </div>
    );
}

/**
 * Renders a single nested key/value pair.
 * - Primitive values → FileAnnotationRow
 * - Object values → FileAnnotationRowGroup (recursive, single-entry)
 * - Array values → FileAnnotationRowGroup (recursive, array)
 */
function renderNestedValue(
    key: string,
    value: NestedAnnotationValue,
    depth: number,
    fmsStateIndicator?: boolean
): React.ReactElement {
    if (Array.isArray(value)) {
        // Nested array of objects — the array elements should all be NestedAnnotation objects.
        const arrOfObjects = value.filter(
            (v) => typeof v === "object" && v !== null && !Array.isArray(v)
        ) as NestedAnnotation[];
        if (arrOfObjects.length > 0) {
            return (
                <FileAnnotationRowGroup
                    key={key}
                    className={classNames(styles.row, styles.nestedRow)}
                    name={key}
                    value={arrOfObjects}
                    fmsStateIndicator={fmsStateIndicator}
                    depth={depth}
                />
            );
        }
        // Array of primitives — render as a comma-separated row.
        return (
            <FileAnnotationRow
                key={key}
                className={classNames(styles.row, styles.nestedRow)}
                name={key}
                value={value.map((v) => (v === null ? "" : String(v))).join(", ")}
                fmsStateIndicator={fmsStateIndicator}
                depth={depth}
            />
        );
    }

    if (typeof value === "object" && value !== null) {
        return (
            <FileAnnotationRowGroup
                key={key}
                className={classNames(styles.row, styles.nestedRow)}
                name={key}
                value={value as NestedAnnotation}
                fmsStateIndicator={fmsStateIndicator}
                depth={depth}
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
        />
    );
}
