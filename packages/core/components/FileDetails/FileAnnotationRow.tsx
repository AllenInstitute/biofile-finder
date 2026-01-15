import { Icon } from "@fluentui/react";
import classNames from "classnames";
import * as React from "react";
import { useDispatch, useSelector } from "react-redux";

import MarkdownText from "../MarkdownText";
import Tooltip from "../Tooltip";
import Cell from "../../components/FileRow/Cell";
import { interaction, metadata, selection } from "../../state";

import styles from "./FileAnnotationRow.module.css";

interface FileAnnotationRowProps {
    className?: string;
    name: string;
    value: string;
    fmsStateIndicator?: boolean;
}

/**
 * Component responsible for rendering the metadata pertaining to a file inside the file
 * details pane on right hand side of the application.
 */
export default function FileAnnotationRow(props: FileAnnotationRowProps) {
    const dispatch = useDispatch();
    const trimmedValue = props.value.trim();
    const [showLongValue, setShowLongValue] = React.useState(false);
    const shouldDisplaySmallFont = useSelector(selection.selectors.getShouldDisplaySmallFont);
    const annotationNameToAnnotationMap = useSelector(
        metadata.selectors.getAnnotationNameToAnnotationMap
    );

    const isOpenFileLink = annotationNameToAnnotationMap[props.name]?.isOpenFileLink;
    // Character length approximately exceeds 4 lines of text
    const isLongValue: boolean = trimmedValue.trim().length > 160;

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
                ...(isLongValue
                    ? showLongValue
                        ? [
                              {
                                  key: "collapse",
                                  text: "Collapse",
                                  title: "Collapse metadata field",
                                  iconProps: {
                                      iconName: "CollapseContent",
                                  },
                                  onClick: () => {
                                      setShowLongValue(false);
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
                                      setShowLongValue(true);
                                  },
                              },
                          ]
                    : []),
            ];
            dispatch(interaction.actions.showContextMenu(items, evt.nativeEvent));
        };
    };

    return (
        <div className={classNames(props.className, styles.row)}>
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
                {isOpenFileLink ? (
                    <a
                        className={styles.link}
                        onContextMenu={onContextMenuHandlerFactory(trimmedValue)}
                        href={trimmedValue}
                        rel="noreferrer"
                        target="_blank"
                    >
                        {trimmedValue}
                    </a>
                ) : (
                    <span onContextMenu={onContextMenuHandlerFactory(trimmedValue)}>
                        <MarkdownText
                            className={classNames({
                                [styles.valueTruncated]: !showLongValue && isLongValue,
                            })}
                            text={trimmedValue}
                        />
                        {isLongValue && (
                            <div className={styles.expandButtonWrapper}>
                                <Tooltip content={showLongValue ? "Collapse text" : "Expand text"}>
                                    <Icon
                                        className={styles.expandButton}
                                        iconName={
                                            showLongValue ? "ChevronUpSmall" : "ChevronDownSmall"
                                        }
                                        data-testid={
                                            showLongValue ? "collapse-metadata" : "expand-metadata"
                                        }
                                        onClick={() => setShowLongValue(!showLongValue)}
                                    />
                                </Tooltip>
                            </div>
                        )}
                    </span>
                )}
            </Cell>
        </div>
    );
}
