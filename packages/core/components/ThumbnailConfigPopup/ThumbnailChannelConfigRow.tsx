import React, { ReactElement } from "react";

import { TransparentIconButton } from "../Buttons";
import Checkbox from "../Checkbox";
import ColorPickerButton from "../ColorPickerButton";
import { ThumbnailChannelConfig } from "../../state/selection/actions";

import styles from "./ThumbnailChannelConfigRow.module.css";

type ThumbnailChannelConfigRowProps = {
    channelConfig: ThumbnailChannelConfig;
    index: number;
    onChange: (newConfig: ThumbnailChannelConfig) => void;
    onDelete: () => void;
    showDelete: boolean;
};

export default function ThumbnailChannelConfigRow(
    props: ThumbnailChannelConfigRowProps
): ReactElement {
    return (
        <div className={styles.channelControlRow}>
            <div className={styles.channelControlContainer}>
                <label htmlFor={`channel-${props.index}-enabled`}>C{props.index}</label>
                <Checkbox
                    id={`channel-${props.index}-enabled`}
                    label=""
                    initialValue={props.channelConfig.enabled}
                    onChange={(_e, checked) =>
                        props.onChange({ ...props.channelConfig, enabled: !!checked })
                    }
                ></Checkbox>
                <ColorPickerButton
                    hexColor={props.channelConfig.hexColor}
                    onChange={(newColor) =>
                        props.onChange({ ...props.channelConfig, hexColor: newColor })
                    }
                    disabled={!props.channelConfig.enabled}
                ></ColorPickerButton>
            </div>

            {props.showDelete && (
                <TransparentIconButton
                    className={styles.deleteButton}
                    iconName="Cancel"
                    onClick={props.onDelete}
                ></TransparentIconButton>
            )}
        </div>
    );
}
