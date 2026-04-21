import classNames from "classnames";
import * as React from "react";
import { useDispatch, useSelector } from "react-redux";

import { TertiaryButton } from "../Buttons";
import { selection } from "../../state";

import styles from "./GlobalActionButtonRow.module.css";

interface Props {
    className?: string;
}

/**
 * Top row of action buttons that are global to the app.
 */
export default function GlobalActionButtonRow(props: Props) {
    const dispatch = useDispatch();
    const shouldDisplaySmallFont = useSelector(selection.selectors.getShouldDisplaySmallFont);

    return (
        <div className={classNames(styles.container, props.className)}>
            <div className={styles.buttonGroup}>
                <TertiaryButton
                    iconName="FontIncrease"
                    isSelected={!shouldDisplaySmallFont}
                    onClick={() =>
                        dispatch(selection.actions.adjustGlobalFontSize(!shouldDisplaySmallFont))
                    }
                    title="Large font size"
                />
                <TertiaryButton
                    iconName="FontDecrease"
                    isSelected={shouldDisplaySmallFont}
                    onClick={() =>
                        dispatch(selection.actions.adjustGlobalFontSize(!shouldDisplaySmallFont))
                    }
                    title="Small font size"
                />
            </div>
        </div>
    );
}
