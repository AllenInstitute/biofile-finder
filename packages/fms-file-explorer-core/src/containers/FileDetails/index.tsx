import * as classNames from "classnames";
import * as React from "react";
import { useSelector } from "react-redux";

import WindowActionButton from "../../components/WindowActionButton";
import { selection } from "../../state";
import useFileDetails from "./useFileDetails";
import windowStateReducer, { INITIAL_STATE, WindowState } from "./windowStateReducer";

const styles = require("./style.module.css");

interface FileDetails {
    className?: string;
}

const windowStateToWidthMap: { [index: string]: string } = {
    [WindowState.MINIMIZED]: "26px",
    [WindowState.MAXIMIZED]: "100%",
};

/**
 * Right-hand sidebar of application. Displays details of selected file(s).
 */
export default function FileDetails(props: FileDetails) {
    const [windowState, dispatch] = React.useReducer(windowStateReducer, INITIAL_STATE);

    const fileToDetail = useSelector(selection.selectors.getFirstSelectedFile);
    const [fileDetails, isLoading] = useFileDetails(fileToDetail);

    return (
        <div
            className={classNames(styles.root, props.className)}
            style={{ width: windowStateToWidthMap[windowState.state] }}
        >
            <div className={styles.windowButtons}>
                {windowState.possibleActions.map((action) => (
                    <WindowActionButton
                        key={action}
                        action={action}
                        onClick={() => dispatch({ type: action })}
                    />
                ))}
            </div>
            {isLoading ? "Loading..." : JSON.stringify(fileDetails, undefined, 4)}
        </div>
    );
}
