import React, { ReactElement } from "react";

import Checkbox from "../Checkbox";
import ColorPickerButton from "../ColorPickerButton";
import type { ThumbnailChannelConfig } from "../../entity/FileDetail/RenderZarrThumbnailURL";

import styles from "./ThumbnailChannelConfigRow.module.css";

type ThumbnailChannelConfigRowProps = {
    channelConfig: ThumbnailChannelConfig;
    index: number;
    name: string;
    onChange: (newConfig: ThumbnailChannelConfig) => void;
};

export default function ThumbnailChannelConfigRow(
    props: ThumbnailChannelConfigRowProps
): ReactElement {
    return (
        <div className={styles.channelControlRow}>
            <div className={styles.channelControlContainer}>
                <Checkbox
                    id={`channel-${props.index}-enabled`}
                    label=""
                    checked={props.channelConfig.enabled}
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
                <label htmlFor={`channel-${props.index}-enabled`}>{props.name}</label>
            </div>
        </div>
    );
}
