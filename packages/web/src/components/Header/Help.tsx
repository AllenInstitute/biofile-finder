import { DirectionalHint, PrimaryButton } from "@fluentui/react";
import classNames from "classnames";
import * as React from "react";
import { useDispatch } from "react-redux";

import styles from "./Help.module.css";
import useHelpOptions from "../../../../core/hooks/useHelpOptions";

interface Props {
    path: string;
}

export default function HelpMenu(props: Props) {
    const dispatch = useDispatch();
    const isAppRoute: boolean = props.path === "/app";
    const helpOptions = useHelpOptions(dispatch, true, isAppRoute);

    return (
        <PrimaryButton
            ariaLabel="Help"
            className={classNames(styles.helpMenuButton, styles.headerOption)}
            styles={{ label: styles.helpMenuLabel }}
            id="helpmenu"
            menuIconProps={{ iconName: "ChevronDown" }}
            text="Help"
            menuProps={{
                className: styles.helpMenu,
                directionalHint: DirectionalHint.bottomAutoEdge,
                shouldFocusOnMount: true,
                items: helpOptions,
            }}
        />
    );
}
