import { Icon } from "@fluentui/react";
import classNames from "classnames";
import * as React from "react";
import { useDispatch, useSelector } from "react-redux";

import FileAnnotationRow from "./FileAnnotationRow";
import Tooltip from "../Tooltip";
import Cell from "../../components/FileRow/Cell";
import { FmsFileAnnotationValue, NestedAnnotation } from "../../services/FileService";
import { interaction, metadata, selection } from "../../state";

import styles from "./FileAnnotationRowGroup.module.css";


interface Props {
    className?: string;
    name: string;
    value: NestedAnnotation;
    fmsStateIndicator?: boolean;
    style?: React.CSSProperties;
    depth: number;
}

/**
 * TODO
 */
export default function FileAnnotationRowGroup(props: Props) {
    const dispatch = useDispatch();
    const shouldDisplaySmallFont = useSelector(selection.selectors.getShouldDisplaySmallFont);
    const annotationNameToAnnotationMap = useSelector(
        metadata.selectors.getAnnotationNameToAnnotationMap
    );

    // const trimmedValue = props.value.trim();
    const annotation = annotationNameToAnnotationMap[props.name];
    console.log("Rendering FileAnnotationRowGroup with props:", props);
    const [showNestedValues, setShowNestedValues] = React.useState(false);
    // Character length approximately exceeds 4 lines of text
    // const isLongValue: boolean = trimmedValue.trim().length > 160;

    const onContextMenuHandlerFactory = (clipboardText: string) => {
        return (evt: React.MouseEvent) => {
            evt.preventDefault();
            const items = [
                {
                    key: "copy",
                    text: "Copy",
                    title: "Copy to clipboard",
                    iconProps: {
                        iconName: "Copy",
                    },
                    onClick: () => {
                        navigator.clipboard.writeText(clipboardText);
                    },
                },
                ...(showNestedValues
                    ? [
                            {
                                key: "collapse",
                                text: "Collapse",
                                title: "Collapse metadata field",
                                iconProps: {
                                    iconName: "CollapseContent",
                                },
                                onClick: () => {
                                    setShowNestedValues(false);
                                },
                            },
                        ]
                    : [
                            {
                                key: "expand",
                                text: "Expand",
                                title: "Expand metadata field",
                                iconProps: {
                                    iconName: "ExploreContent",
                                },
                                onClick: () => {
                                    setShowNestedValues(true);
                                },
                            },
                    ])
            ];
            dispatch(interaction.actions.showContextMenu(items, evt.nativeEvent));
        };
    };

    // well -> a3 -> unit -> dose -> unit mL
    // well -> a3 -> unit -> dose -> value 0.5
    // Well (group)
    //   a3 (array)
    //     unit (group)
    //       dose (array)
    //         unit: mL
    //         value: 0.5
    let nestedValues = null;
    if (showNestedValues) {
        // a3 
        // unit
        nestedValues = Object.entries(props.value).flatMap(([valueForGroup, group]) => {
            // dose
            let element = null;
            if (typeof group === "object" && group !== null && !Array.isArray(group)) {
                console.log("group is an object, rendering nested group for:", valueForGroup, group);
                element = (
                    <>
                        {Object.entries(group).map(([nestedKey, nestedValue]) => (
                            typeof nestedValue === "object" && nestedValue !== null && !Array.isArray(nestedValue)
                            ? (
                                <FileAnnotationRowGroup
                                    key={nestedKey}
                                    className={classNames(props.className, styles.nestedGroup)}
                                    name={nestedKey}
                                    value={nestedValue as any}
                                    fmsStateIndicator={props.fmsStateIndicator}
                                    depth={props.depth + 2}
                                    style={{ paddingLeft: `calc(0.5em * ${2})` }}
                                />
                            ) : (
                                <FileAnnotationRow
                                    key={nestedKey}
                                    className={classNames(styles.row, styles.nestedRow)}
                                    name={nestedKey}
                                    // TODO: how is the rest of the app doing this string guarantee?
                                    value={String(nestedValue)}
                                    fmsStateIndicator={props.fmsStateIndicator}
                                    style={{ paddingLeft: `calc(0.5em * ${2})` }}
                                />
                            )
                        ))}
                    </>
                );
            } else {
                console.log("group is not an object, rendering as value:", group);
                element = (
                    <FileAnnotationRow
                        key={valueForGroup}
                        className={classNames(styles.row, styles.nestedRow)}
                        name={valueForGroup}
                        // TODO: how is the rest of the app doing this string guarantee?
                        value={String(group)}
                        fmsStateIndicator={props.fmsStateIndicator}
                        style={{ paddingLeft: `calc(0.5em * ${2})` }}
                    />
                )
            }
            return (
                <div className={styles.rowGroup} style={{ paddingLeft: `calc(0.5em * ${props.depth + 1})` }}>
                    <div
                        className={styles.rowGroupTitle}
                    >
                        {valueForGroup}
                    </div>
                    {element}
                </div>
            )
        });
    }
    
    return (
        <>
            <div className={classNames(props.className, styles.row)} style={props.style}>
                <Cell
                    className={classNames(styles.cell, styles.key, {
                        [styles.smallFont]: shouldDisplaySmallFont,
                    })}
                    columnKey="key"
                    width={1}
                    title={annotationNameToAnnotationMap[props.name]?.description}
                >
                    <span
                        style={{ userSelect: "text" }}
                        onContextMenu={onContextMenuHandlerFactory(props.name)}
                    >
                        {props.name}
                    </span>
                </Cell>
                <Cell
                    className={classNames(styles.cell, styles.value, {
                        [styles.smallFont]: shouldDisplaySmallFont,
                        [styles.fmsStateIndicator]: props.fmsStateIndicator,
                    })}
                    columnKey="value"
                    width={1}
                >
                    {!showNestedValues && (
                        <span
                            style={{ userSelect: "text" }}
                        >
                            {Object.keys(props.value).join(", ")}
                        </span>
                    )}
                    <div className={styles.expandButtonWrapper}>
                        <Tooltip content={showNestedValues ? "Collapse nested fields" : "Expand nested fields"}>
                            <Icon
                                className={styles.expandButton}
                                iconName={
                                    showNestedValues ? "ChevronUpSmall" : "ChevronDownSmall"
                                }
                                data-testid={
                                    showNestedValues ? "collapse-nested-fields" : "expand-nested-fields"
                                }
                                onClick={() => setShowNestedValues(!showNestedValues)}
                            />
                        </Tooltip>
                    </div>
                </Cell>
            </div>
            {nestedValues}
        </>
    );
}
