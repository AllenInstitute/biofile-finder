import { DefaultButton } from "@fluentui/react";
// prettier-ignore
import { Handle, Position, NodeProps } from '@xyflow/react';
import classNames from "classnames";
import React from "react";
import { useDispatch, useSelector } from "react-redux";

import nodeMenuItems from "./nodeMenuItems";
import { useButtonMenu } from "../../Buttons";
import FileThumbnail from "../../FileThumbnail";
import Tooltip from "../../Tooltip";
import { FileNode as FileNodeType, MetadataNode as MetadataNodeType } from "../../../entity/Graph";
import useOpenWithMenuItems from "../../../hooks/useOpenWithMenuItems";
import useTruncatedString from "../../../hooks/useTruncatedString";
import { interaction } from "../../../state";

import styles from "./FileNode.module.css";

/**
 * Custom node element for displaying a File and providing interaction
 * options related to a file
 */
export default function FileNode(props: NodeProps<FileNodeType | MetadataNodeType>) {
    const file = props.data.file;
    const dispatch = useDispatch();
    const graph = useSelector(interaction.selectors.getGraph);

    const openWithSubMenuItems = useOpenWithMenuItems(file);
    const buttonMenu = useButtonMenu({
        items: [
            {
                key: "view-metadata",
                text: "View metadata",
                onClick: () => {
                    dispatch(interaction.actions.toggleFileDetailsPanel(file));
                },
            },
            {
                key: "Open with...",
                text: "Open with...",
                subMenuProps: {
                    items: openWithSubMenuItems,
                },
            },
            {
                key: "Download",
                text: "Download",
                onClick: () => {
                    file && dispatch(interaction.actions.downloadFiles([file]));
                },
            },
            ...nodeMenuItems(dispatch, graph, props.id, file),
        ],
    });

    if (!file) {
        console.error("This should never happen, a <FileNode /> was rendered without a file");
        throw new Error(JSON.stringify(props));
    }

    return (
        <Tooltip content={file.name}>
            <DefaultButton
                className={classNames(styles.fileNode, {
                    [styles.currentFile]: props.data.isSelected,
                })}
                menuProps={buttonMenu}
            >
                <Handle
                    className={styles.handle}
                    type="target"
                    isConnectable={false}
                    position={Position.Top}
                />
                <div className={styles.contentContainer}>
                    <FileThumbnail uri={file.thumbnail} height={100} width={100} />
                    <div className={styles.fileNodeLabel}>{useTruncatedString(file.name, 10)}</div>
                </div>
                <Handle
                    className={styles.handle}
                    type="source"
                    isConnectable={false}
                    position={Position.Bottom}
                />
            </DefaultButton>
        </Tooltip>
    );
}
