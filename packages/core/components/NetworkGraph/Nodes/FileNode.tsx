import { DefaultButton } from '@fluentui/react';
// prettier-ignore
import { Handle, Position, NodeProps } from '@xyflow/react';
import classNames from "classnames";
import React from "react";
import { useDispatch, useSelector } from 'react-redux';

import { useButtonMenu } from '../../Buttons';
import FileThumbnail from "../../FileThumbnail";
import Tooltip from '../../Tooltip';
import { ProvenanceNode } from '../../../entity/GraphGenerator';
import useOpenWithMenuItems from '../../../hooks/useOpenWithMenuItems';
import { interaction } from '../../../state';

import styles from "./FileNode.module.css";


// Display the start of the file name and at least part of the file type
const clipFileName = (filename: string) => {
    if (filename.length > 15) {
        return filename.slice(0, 6) + "..." + filename.slice(-4);
    }
    return filename;
};

/**
 * Custom node element for displaying a File and providing interaction
 * options related to a file
 */
export default function FileNode(props: NodeProps<ProvenanceNode>) {
    const file = props.data.file;
    const dispatch = useDispatch();
    const graphHasMoreToSearch = useSelector(interaction.selectors.getGraphHasMoreToSearch);

    const openWithSubMenuItems = useOpenWithMenuItems(file);
    const buttonMenu = useButtonMenu({
        items: [
            {
                key: "view-metadata",
                text: "View metadata",
                onClick: () => {
                    dispatch(interaction.actions.toggleFileDetailsPanel(file));
                }
            },
            {
                key: "Open with...",
                text: "Open with...",
                subMenuProps: {
                    items: openWithSubMenuItems
                }
            },
            {
                key: "Download",
                text: "Download",
                onClick: () => {
                    file && dispatch(interaction.actions.downloadFiles([file]));
                }
            },
            {
                key: "check-for-more-relationships",
                text: "Check for more relationships",
                title: graphHasMoreToSearch ? undefined : "All relationships have been checked",
                disabled: !graphHasMoreToSearch,
                onClick: () => {
                    dispatch(interaction.actions.setOriginForProvenance(file));
                }
            },
        ],
    });

    if (!file) {
        console.error("This should never happen, a <FileNode /> was rendered without a file");
        return null;
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
                    <FileThumbnail
                        uri={file.thumbnail}
                        height={100}
                        width={100}
                    />
                    <div className={styles.fileNodeLabel}>{clipFileName(file.name)}</div>
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
