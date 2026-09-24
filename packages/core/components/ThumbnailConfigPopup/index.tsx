import { Callout, DirectionalHint } from "@fluentui/react";
import React, { ReactElement, useRef, useState } from "react";

import styles from "./ThumbnailConfigPopup.module.css";
import Checkbox from "../Checkbox";
import { ThumbnailConfig } from "../../state/selection/actions";
import LabeledSlider from "../LabeledSlider";

type ThumbnailConfigPopupProps = {
    renderButton: (onClick: () => void) => ReactElement;
    thumbnailConfig: ThumbnailConfig;
    setThumbnailConfig: (newConfig: ThumbnailConfig) => void;
};

export default function ThumbnailConfigPopup(props: ThumbnailConfigPopupProps): ReactElement {
    const { thumbnailConfig, setThumbnailConfig } = props;

    const [isCalloutVisible, setIsCalloutVisible] = useState(false);
    const divRef = useRef<HTMLDivElement>(null);

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
                    </div>
                </Callout>
            ) : null}
        </>
    );
}
