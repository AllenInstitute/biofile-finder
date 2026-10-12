import { Callout, DirectionalHint } from "@fluentui/react";
import React, { ReactElement, useEffect, useRef, useState } from "react";

import ThumbnailAxisSliderRow from "./ThumbnailAxisSliderRow";
import ThumbnailChannelConfigRow from "./ThumbnailChannelConfigRow";
import { TransparentIconButton } from "../Buttons";
import Checkbox from "../Checkbox";
import type { ThumbnailConfig, ZarrInfo } from "../../entity/FileDetail/RenderZarrThumbnailURL";

import styles from "./ThumbnailConfigPopup.module.css";

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
    const missingZDim = zarrInfo !== undefined && (zarrInfo?.dimensions.z ?? 0) <= 1;
    const missingTDim = zarrInfo !== undefined && (zarrInfo?.dimensions.t ?? 0) <= 1;

    useEffect(() => {
        // Add more channel configs to match count in current Zarr image
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
        // Show up to the number of channels in the Zarr image when dimensions
        // are provided.
        if (zarrInfo?.dimensions.c !== undefined && index >= zarrInfo.dimensions.c) {
            return null;
        }
        const channelName = zarrInfo?.channelNames?.[index] ?? `C${index + 1}`;
        return (
            <ThumbnailChannelConfigRow
                key={index}
                channelConfig={config}
                index={index}
                name={channelName}
                onChange={(newConfig) => onChangeChannelConfig(index, newConfig)}
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
                    aria-label="Zarr thumbnail settings"
                    onDismiss={() => {
                        setIsCalloutVisible(false);
                    }}
                    target={divRef}
                    backgroundColor="var(--secondary-background-color)"
                    directionalHint={DirectionalHint.bottomLeftEdge}
                >
                    <div className={styles.calloutContent}>
                        <div className={styles.calloutTitleRow}>
                            <span className={styles.calloutTitle}>Zarr thumbnail settings</span>
                            <TransparentIconButton
                                className={styles.calloutCloseButton}
                                iconName="Cancel"
                                onClick={() => setIsCalloutVisible(false)}
                            ></TransparentIconButton>
                        </div>

                        {!missingTDim && (
                            <ThumbnailAxisSliderRow
                                className={styles.sliceSliders}
                                id="thumbnail-config-t-slider"
                                axis="t"
                                value={thumbnailConfig.relativeT}
                                onChange={(relativeT) =>
                                    setThumbnailConfig({ ...thumbnailConfig, relativeT })
                                }
                                zarrInfo={props.zarrInfo}
                            ></ThumbnailAxisSliderRow>
                        )}

                        {!missingZDim && (
                            <ThumbnailAxisSliderRow
                                className={styles.sliceSliders}
                                id="thumbnail-config-z-slider"
                                axis="z"
                                value={thumbnailConfig.relativeZ}
                                onChange={(relativeZ) =>
                                    setThumbnailConfig({ ...thumbnailConfig, relativeZ })
                                }
                                zarrInfo={props.zarrInfo}
                            ></ThumbnailAxisSliderRow>
                        )}

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
                            label={"Override OMERO metadata"}
                        ></Checkbox>
                        <div className={styles.channelControlList}>{channelConfigRows}</div>
                    </div>
                </Callout>
            ) : null}
        </>
    );
}
