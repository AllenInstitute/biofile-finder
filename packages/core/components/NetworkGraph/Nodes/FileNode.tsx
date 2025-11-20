import { DefaultButton } from '@fluentui/react';
// prettier-ignore
import { Handle, Position, NodeProps } from '@xyflow/react';
import classNames from "classnames";
import React from "react";
import { useDispatch } from 'react-redux';

import { useButtonMenu } from '../../Buttons';
import FileThumbnail from "../../FileThumbnail";
import { ProvenanceNode } from '../../../entity/GraphGenerator';
import { interaction } from '../../../state';

import styles from "./FileNode.module.css";


/**
 * Custom node element for displaying a File and providing interaction
 * options related to a file
 */
export default function FileNode(props: NodeProps<ProvenanceNode>) {
    const file = props.data.file;
    const dispatch = useDispatch();

    const buttonMenu = useButtonMenu({
        items: [
            {
                key: "show-metadata",
                text: "Show metadata",
                onClick: () => {
                    dispatch(interaction.actions.toggleFileDetailsPanel(file));
                }
            },
            {
                key: "check-for-more-neighbors",
                text: "Check for more neighbors",
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
                <div className={styles.fileNodeLabel}>{file.name}</div>
            </div>
            <Handle
                className={styles.handle}
                type="source"
                isConnectable={false}
                position={Position.Bottom}
            />
        </DefaultButton>
    );
}
