import { Callout, ColorPicker, DirectionalHint, IconButton } from "@fluentui/react";
import React, { ReactElement, useRef, useState } from "react";

import styles from "./ThumbnailConfigPopup.module.css";
import Checkbox from "../Checkbox";
import { ThumbnailConfig } from "../../state/selection/actions";
import LabeledSlider from "../LabeledSlider";
import { SecondaryButton } from "../Buttons";

const MIN_CHANNEL_CONTROLS = 3;

type ThumbnailConfigPopupProps = {
    renderButton: (onClick: () => void) => ReactElement;
    thumbnailConfig: ThumbnailConfig;
    setThumbnailConfig: (newConfig: ThumbnailConfig) => void;
};

export default function ThumbnailConfigPopup(props: ThumbnailConfigPopupProps): ReactElement {
    const { thumbnailConfig, setThumbnailConfig } = props;

    const [isCalloutVisible, setIsCalloutVisible] = useState(false);
    const divRef = useRef<HTMLDivElement>(null);

    const onAddChannel = () => {
        const newConfig = { ...thumbnailConfig };
        newConfig.channelConfigs.push({ enabled: true, hexColor: "FFFFFF" });
        setThumbnailConfig(newConfig);
    };

    const makeChannelControl = (index: number): ReactElement => {
        const channelConfig = thumbnailConfig.channelConfigs[index];
        const onToggleEnabled = (enabled: boolean) => {
            const newConfig = { ...thumbnailConfig };
            newConfig.channelConfigs[index].enabled = enabled;
            setThumbnailConfig(newConfig);
        };

        const onColorChanged = (color: string) => {
            const newConfig = { ...thumbnailConfig };
            newConfig.channelConfigs[index].hexColor = color;
            setThumbnailConfig(newConfig);
        };

        const onDeleteChannel = () => {
            const newConfig = { ...thumbnailConfig };
            newConfig.channelConfigs.splice(index, 1);
            setThumbnailConfig(newConfig);
        };

        return (
            <div className={styles.channelControlRow}>
                <div className={styles.channelControlContainer}>
                    <span>Channel {index}</span>
                    <Checkbox
                        label="Enabled"
                        initialValue={channelConfig.enabled}
                        onChange={(_e, checked) => onToggleEnabled(!!checked)}
                    ></Checkbox>
                    <ColorPicker
                        color={"#" + channelConfig.hexColor}
                        onChange={(_e, color) => onColorChanged(color.hex)}
                        alphaType="none"
                    ></ColorPicker>
                </div>

                {index >= MIN_CHANNEL_CONTROLS && (
                    <IconButton
                        iconProps={{ iconName: "Cancel" }}
                        onClick={onDeleteChannel}
                    ></IconButton>
                )}
            </div>
        );
    };

    return (
        <>
            <div ref={divRef} style={{ width: "fit-content" }}>
                {props.renderButton(() => setIsCalloutVisible(true))}
            </div>
            {isCalloutVisible ? (
                <Callout
                    className={styles.callout}
                    role="dialog"
                    onDismiss={() => {
                        setIsCalloutVisible(false);
                    }}
                    target={divRef}
                    backgroundColor="var(--secondary-background-color)"
                    directionalHint={DirectionalHint.bottomLeftEdge}
                >
                    <div className={styles.calloutContent}>
                        <span className={styles.calloutTitle}>Global Thumbnail Settings</span>

                        <LabeledSlider
                            label={"Z%"}
                            min={0}
                            max={100}
                            step={1}
                            value={Math.round(thumbnailConfig.relativeZ * 100)}
                            onChange={(value) => {
                                if (Number.isFinite(value)) {
                                    value = Math.min(Math.max(value, 0), 100) / 100;
                                    setThumbnailConfig({ ...thumbnailConfig, relativeZ: value });
                                }
                            }}
                        ></LabeledSlider>

                        <LabeledSlider
                            label={"T%"}
                            min={0}
                            max={100}
                            step={1}
                            value={Math.round(thumbnailConfig.relativeT * 100)}
                            onChange={(value) => {
                                if (Number.isFinite(value)) {
                                    value = Math.min(Math.max(value, 0), 100) / 100;
                                    setThumbnailConfig({ ...thumbnailConfig, relativeT: value });
                                }
                            }}
                        ></LabeledSlider>

                        <Checkbox
                            initialValue={thumbnailConfig.overrideOmeroMetadata}
                            onChange={function (
                                _ev?: React.FormEvent<HTMLElement | HTMLInputElement>,
                                isCheckedEv?: boolean
                            ): void {
                                setThumbnailConfig({
                                    ...thumbnailConfig,
                                    overrideOmeroMetadata: !!isCheckedEv,
                                });
                            }}
                            label={"Override OMERO metadata"}
                        ></Checkbox>

                        <div className={styles.channelControlList}>
                            {thumbnailConfig.channelConfigs.map((_, index) => {
                                return makeChannelControl(index);
                            })}
                        </div>

                        <SecondaryButton
                            title="+ Add Channel"
                            onClick={onAddChannel}
                        ></SecondaryButton>
                    </div>
                </Callout>
            ) : null}
        </>
    );
}
