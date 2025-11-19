import { Callout } from '@fluentui/react';
// prettier-ignore
import { Handle, Position, NodeProps } from '@xyflow/react';
import classNames from "classnames";
import { debounce } from 'lodash';
import React from "react";
import { useDispatch } from 'react-redux';

import { TertiaryButton } from '../../Buttons';
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
    const container = React.useRef<HTMLDivElement>(null);
    const [isHovered, setIsHovered] = React.useState(false);

    if (!file) {
        console.error("This should never happen, a <FileNode /> was rendered without a file");
        return null;
    }
    
    return (
        <div>
            {!!isHovered && (
                <Callout target={container}>
                    <div>
                        {file.name}
                    </div>
                    <div>
                        <TertiaryButton
                            iconName="Plus"
                            title="Check for more neighbors"
                            onClick={() => dispatch(interaction.actions.setOriginForProvenance(file)) }
                        />
                        <TertiaryButton
                            iconName="Info"
                            title="File Details"
                        />
                    </div>
                </Callout>
            )}
            <div
                className={classNames(styles.fileNode, {
                    [styles.currentFile]: props.data.isSelected,
                })}
                onMouseEnter={debounce(() => setIsHovered(true), 3000, { leading: true, trailing: false })}
                onMouseLeave={() => setIsHovered(false)}
                ref={container}
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
                    {/* // TODO: Add toggle to hide file name? */}
                    <div className={styles.fileNodeLabel}>{file.name}</div>
                </div>
                <Handle
                    className={styles.handle}
                    type="source"
                    isConnectable={false}
                    position={Position.Bottom}
                />
            </div>
        </div>
    );
}
