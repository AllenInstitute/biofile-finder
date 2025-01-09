import classNames from "classnames";
import * as React from "react";
import { Spinner, SpinnerSize } from "@fluentui/react";

import { NO_IMAGE_ICON_PATH_DATA } from "../../icons";
import SvgIcon from "../SvgIcon";

import styles from "./FileThumbnail.module.css";

interface Props {
    className?: string;
    uri?: string;
    height?: number | string;
    width?: number | string;
    loading?: boolean;
    selected?: boolean;
}

/**
 * Displays the thumbnail for a file, or a spinner if loading, or a placeholder if missing.
 */
export default function FileThumbnail(props: Props) {
    // If loading, render the spinner instead of the image
    if (props.loading) {
        return (
            <div
                className={classNames(
                    props.className,
                    styles.fileThumbnail,
                    styles.thumbnailPlaceholder
                )}
                style={{
                    height: props.height,
                    width: props.width,
                    maxHeight: props.height,
                    maxWidth: props.width,
                }}
            >
                <Spinner size={SpinnerSize.large} />
            </div>
        );
    }

    // Render no thumbnail icon if no URI is provided
    if (!props.uri) {
        return (
            <SvgIcon
                height={props?.height || 150}
                pathData={NO_IMAGE_ICON_PATH_DATA}
                viewBox="0,1,22,22"
                width={props?.width || 150}
                className={classNames(styles.noThumbnail, {
                    [styles.noThumbnailSelected]: props?.selected,
                })}
            />
        );
    }

    return (
        <img
            className={classNames(props.className, styles.fileThumbnail)}
            src={props.uri}
            style={{
                height: props.height,
                width: props.width,
                maxHeight: props.height,
                maxWidth: props.width,
            }}
        />
    );
}
