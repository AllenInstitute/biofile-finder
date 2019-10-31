import * as classNames from "classnames";
import * as React from "react";
import { useSelector } from "react-redux";

import { selection } from "../../state";
import useFileDetails from "./useFileDetails";

const styles = require("./style.module.css");

interface FileDetails {
    className?: string;
}

/**
 * Right-hand sidebar of application. Displays details of selected file(s).
 */
export default function FileDetails(props: FileDetails) {
    const fileToDetail = useSelector(selection.selectors.getFirstSelectedFile);
    const [fileDetails, isLoading] = useFileDetails(fileToDetail);

    return (
        <div className={classNames(styles.root, props.className)}>
            {isLoading ? "Loading..." : JSON.stringify(fileDetails, undefined, 4)}
        </div>
    );
}
