import classNames from "classnames";
import * as React from "react";
import { useDispatch, useSelector } from "react-redux";

import useFileDetails from "./useFileDetails";
import FileDetails from "../FileDetails";
import { interaction } from "../../state";

import styles from "./FileDetailPanel.module.css";


/**
 * Right-hand sidebar of application. Displays details of selected file(s).
 */
export default function FileDetailPanel() {
    const dispatch = useDispatch();
    // TODO: Move logic for determining which file to show in the detail panel into a selector
    // or this custom hook and simplify this component to just call that selector and pass the result to FileDetails or
    // just remove this component entirelyThis will also make it easier to write tests for this logic.
    const [selectedFile, isLoading] = useFileDetails();
    const origin = useSelector(interaction.selectors.getOriginForProvenance);
    const fileForDetailPanel = useSelector(interaction.selectors.getFileForDetailPanel);

    const file = origin ? fileForDetailPanel : selectedFile;
    return (
        <FileDetails
            className={classNames({ [styles.hideRight]: !!origin && !fileForDetailPanel })}
            file={file}
            isLoading={isLoading}
            onClose={
                origin ?
                    () => dispatch(interaction.actions.toggleFileDetailsPanel())
                    : undefined
            }
        />
    )
}
