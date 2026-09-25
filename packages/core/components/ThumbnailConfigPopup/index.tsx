import { Callout, DirectionalHint } from "@fluentui/react";
import React, { ReactElement, useRef, useState } from "react";

import ThumbnailChannelConfigRow from "./ThumbnailChannelConfigRow";
import { SecondaryButton, TransparentIconButton } from "../Buttons";
import Checkbox from "../Checkbox";
import LabeledSlider from "../LabeledSlider";
import { ThumbnailConfig } from "../../state/selection/actions";

import styles from "./ThumbnailConfigPopup.module.css";

const MIN_CHANNEL_CONTROLS = 1;

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

    const onDeleteChannel = (index: number) => {
        const newConfig = { ...thumbnailConfig };
        newConfig.channelConfigs.splice(index, 1);
        setThumbnailConfig(newConfig);
    };

    const onChangeChannelConfig = (
        index: number,
        newConfig: { enabled: boolean; hexColor: string }
    ) => {
        const updatedConfig = { ...thumbnailConfig };
        updatedConfig.channelConfigs[index] = newConfig;
        setThumbnailConfig(updatedConfig);
    };

    const channelConfigRows = thumbnailConfig.channelConfigs.map((config, index) => {
        return (
            <ThumbnailChannelConfigRow
                key={index}
                channelConfig={config}
                index={index}
                onChange={(newConfig) => onChangeChannelConfig(index, newConfig)}
                onDelete={() => onDeleteChannel(index)}
                showDelete={thumbnailConfig.channelConfigs.length > MIN_CHANNEL_CONTROLS}
            ></ThumbnailChannelConfigRow>
        );
    });

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
                        <div className={styles.calloutTitleRow}>
                            <span className={styles.calloutTitle}>Global Thumbnail Settings</span>
                            <TransparentIconButton
                                className={styles.calloutCloseButton}
                                iconName="Cancel"
                                onClick={() => setIsCalloutVisible(false)}
                            ></TransparentIconButton>
                        </div>

                        <LabeledSlider
                            className={styles.sliceSliders}
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
                            className={styles.sliceSliders}
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

                        <p className={styles.channelTitle}>Channels</p>
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
                            label={"Override metadata colors (.zarr)"}
                        ></Checkbox>
                        <div className={styles.channelControlList}>{channelConfigRows}</div>

                        <SecondaryButton
                            text="+ Add Channel"
                            onClick={onAddChannel}
                        ></SecondaryButton>
                    </div>
                </Callout>
            ) : null}
        </>
    );
}
