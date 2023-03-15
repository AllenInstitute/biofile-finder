import classNames from "classnames";
import * as React from "react";
import { useDispatch } from "react-redux";

import getContextMenuItems from "../ContextMenu/items";
import Cell from "../../components/FileRow/Cell";
import { interaction } from "../../state";

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

    const onContextMenuHandlerFactory = (clipboardText: string) => {
        return (evt: React.MouseEvent) => {
            const availableItems = getContextMenuItems(dispatch);
            console.log("hello");
            console.log(dispatch);
            console.log(availableItems);
            const items = [
                {
                    ...availableItems.COPY,
                    title: "Copy to clipboard",
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
            <Cell className={classNames(styles.cell, styles.key)} columnKey="key" width={1}>
                <span
                    style={{ userSelect: "text" }}
                    onContextMenu={onContextMenuHandlerFactory(props.name)}
                >
                    {props.name}
                </span>
            </Cell>
            <Cell className={classNames(styles.cell, styles.value)} columnKey="value" width={1}>
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
