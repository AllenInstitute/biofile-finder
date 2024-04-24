import classNames from "classnames";
import * as React from "react";
import { useDispatch, useSelector } from "react-redux";

import getContextMenuItems from "../ContextMenu/items";
import Cell from "../../components/FileRow/Cell";
import { interaction, selection } from "../../state";

import styles from "./FileAnnotationRow.module.css";

interface FileAnnotationRowProps {
    className?: string;
    name: string;
    value: string;
}

/**
 * Component responsible for rendering the metadata pertaining to a file inside the file
 * details pane on right hand side of the application.
 */
export default function FileAnnotationRow(props: FileAnnotationRowProps) {
    const dispatch = useDispatch();
    const shouldDisplaySmallFont = useSelector(selection.selectors.getShouldDisplaySmallFont);

    const onContextMenuHandlerFactory = (clipboardText: string) => {
        return (evt: React.MouseEvent) => {
            const availableItems = getContextMenuItems(dispatch);
            const items = [
                {
                    ...availableItems.COPY,
                    onClick: () => {
                        navigator.clipboard.writeText(clipboardText);
                    },
                },
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
                })}
                columnKey="value"
                width={1}
            >
                <span
                    style={{ userSelect: "text" }}
                    onContextMenu={onContextMenuHandlerFactory(props.value.trim())}
                >
                    {props.value.trim()}
                </span>
            </Cell>
        </div>
    );
}
