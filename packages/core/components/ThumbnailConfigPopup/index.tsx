import { Callout, DirectionalHint } from "@fluentui/react";
import React, { ReactElement, useEffect, useRef, useState } from "react";

import ThumbnailChannelConfigRow from "./ThumbnailChannelConfigRow";
import { SecondaryButton, TransparentIconButton } from "../Buttons";
import Checkbox from "../Checkbox";
import LabeledSlider from "../LabeledSlider";
import type { ThumbnailConfig, ZarrInfo } from "../../entity/FileDetail/RenderZarrThumbnailURL";

import styles from "./ThumbnailConfigPopup.module.css";

const MIN_CHANNEL_CONTROLS = 1;

type ThumbnailConfigPopupProps = {
    /**
     * Callback to render the triggering button; use the `onClick` callback to
     * show/hide the popup.
     */
    renderButton: (onClick: () => void) => ReactElement;
    thumbnailConfig: ThumbnailConfig;
    setThumbnailConfig: (newConfig: ThumbnailConfig) => void;
    /**
     * Information about the Zarr array. If set, the dimensions are used to set
     * the bounds on the thumbnail controls, and the channel names are used to
     * label the channels.
     */
    zarrInfo: ZarrInfo | undefined;
};

/**
 * A popup config panel for adjusting thumbnail settings. Triggers when the button
 * rendered by the `renderButton` prop is clicked.
 */
export default function ThumbnailConfigPopup(props: ThumbnailConfigPopupProps): ReactElement {
    const { thumbnailConfig, setThumbnailConfig } = props;

    const [isCalloutVisible, setIsCalloutVisible] = useState(false);
    const divRef = useRef<HTMLDivElement>(null);

    const onAddChannel = () => {
        const newConfig = {
            ...thumbnailConfig,
            channelConfigs: [...thumbnailConfig.channelConfigs],
        };
        newConfig.channelConfigs.push({ enabled: true, hexColor: "FFFFFF" });
        setThumbnailConfig(newConfig);
    };

    const onDeleteChannel = (index: number) => {
        const newConfig = {
            ...thumbnailConfig,
            channelConfigs: [...thumbnailConfig.channelConfigs],
        };
        newConfig.channelConfigs.splice(index, 1);
        setThumbnailConfig(newConfig);
    };

    const onChangeChannelConfig = (
        index: number,
        newConfig: { enabled: boolean; hexColor: string }
    ) => {
        const updatedConfig = {
            ...thumbnailConfig,
            channelConfigs: [...thumbnailConfig.channelConfigs],
        };
        updatedConfig.channelConfigs[index] = newConfig;
        setThumbnailConfig(updatedConfig);
    };

    const zarrInfo = props.zarrInfo;
    const zarrDims = zarrInfo?.dimensions;
    const hasDims = zarrInfo !== undefined;
    // TODO: Disable T/Z controls when dims are loaded but undefined for that
    // channel

    useEffect(() => {
        // Add more channel controls if the current Zarr image has more channels
        if (zarrInfo?.dimensions.c !== undefined) {
            const channelCount = zarrInfo.dimensions.c;
            if (thumbnailConfig.channelConfigs.length >= channelCount) {
                return;
            }
            const newConfig = {
                ...thumbnailConfig,
                channelConfigs: [...thumbnailConfig.channelConfigs],
            };
            while (newConfig.channelConfigs.length < channelCount) {
                newConfig.channelConfigs.push({ enabled: false, hexColor: "FFFFFF" });
            }
            setThumbnailConfig(newConfig);
        }
    }, [zarrInfo, thumbnailConfig, setThumbnailConfig]);

    const channelConfigRows = thumbnailConfig.channelConfigs.map((config, index) => {
        // Exit early if the channel index exceeds the number of channels in the Zarr image
        if (zarrInfo?.dimensions.c !== undefined && index >= zarrInfo.dimensions.c) {
            return null;
        }
        const minChannels = zarrInfo?.dimensions.c ?? MIN_CHANNEL_CONTROLS;
        const channelName = zarrInfo?.channelNames?.[index] ?? `C${index + 1}`;
        return (
            <ThumbnailChannelConfigRow
                key={index}
                channelConfig={config}
                index={index}
                name={channelName}
                onChange={(newConfig) => onChangeChannelConfig(index, newConfig)}
                onDelete={() => onDeleteChannel(index)}
                showDelete={thumbnailConfig.channelConfigs.length > minChannels}
            ></ThumbnailChannelConfigRow>
        );
    });

    return (
        <>
            <div ref={divRef} style={{ width: "fit-content" }}>
                {props.renderButton(() => setIsCalloutVisible(!isCalloutVisible))}
            </div>
            {isCalloutVisible ? (
                <Callout
                    className={styles.callout}
                    role="dialog"
                    aria-label="Global thumbnail settings"
                    onDismiss={() => {
                        setIsCalloutVisible(false);
                    }}
                    target={divRef}
                    backgroundColor="var(--secondary-background-color)"
                    directionalHint={DirectionalHint.bottomLeftEdge}
                >
                    <div className={styles.calloutContent}>
                        <div className={styles.calloutTitleRow}>
                            <span className={styles.calloutTitle}>Global thumbnail settings</span>
                            <TransparentIconButton
                                className={styles.calloutCloseButton}
                                iconName="Cancel"
                                onClick={() => setIsCalloutVisible(false)}
                            ></TransparentIconButton>
                        </div>

                        <LabeledSlider
                            className={styles.sliceSliders}
                            id="thumbnail-config-z-slider"
                            label={hasDims ? "Z" : "Z%"}
                            labelFormatter={(value) => (hasDims ? `${value}` : `${value}%`)}
                            min={0}
                            max={zarrDims?.z !== undefined ? zarrDims.z - 1 : 100}
                            step={1}
                            value={
                                zarrDims?.z !== undefined
                                    ? Math.round(thumbnailConfig.relativeZ * (zarrDims.z - 1))
                                    : Math.round(thumbnailConfig.relativeZ * 100)
                            }
                            onChange={(value) => {
                                const max = zarrDims?.z !== undefined ? zarrDims.z - 1 : 100;
                                if (Number.isFinite(value)) {
                                    value = Math.min(Math.max(value, 0), max) / max;
                                    setThumbnailConfig({ ...thumbnailConfig, relativeZ: value });
                                }
                            }}
                        ></LabeledSlider>

                        <LabeledSlider
                            className={styles.sliceSliders}
                            id="thumbnail-config-t-slider"
                            label={hasDims ? "T" : "T%"}
                            min={0}
                            max={zarrDims?.t !== undefined ? zarrDims.t - 1 : 100}
                            labelFormatter={(value) => (hasDims ? `${value}` : `${value}%`)}
                            step={1}
                            value={
                                zarrDims?.t !== undefined
                                    ? Math.round(thumbnailConfig.relativeT * (zarrDims.t - 1))
                                    : Math.round(thumbnailConfig.relativeT * 100)
                            }
                            onChange={(value) => {
                                const max = zarrDims?.t !== undefined ? zarrDims.t - 1 : 100;
                                if (Number.isFinite(value)) {
                                    value = Math.min(Math.max(value, 0), max) / max;
                                    setThumbnailConfig({ ...thumbnailConfig, relativeT: value });
                                }
                            }}
                        ></LabeledSlider>

                        <p className={styles.channelTitle}>Channels</p>
                        <Checkbox
                            checked={thumbnailConfig.overrideOmeroMetadata}
                            onChange={(
                                _ev?: React.FormEvent<HTMLElement | HTMLInputElement>,
                                isCheckedEv?: boolean
                            ): void =>
                                setThumbnailConfig({
                                    ...thumbnailConfig,
                                    overrideOmeroMetadata: !!isCheckedEv,
                                })
                            }
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
