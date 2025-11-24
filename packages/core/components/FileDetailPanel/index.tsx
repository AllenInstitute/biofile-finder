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
    const [selectedFile, isLoading] = useFileDetails();
    const origin = useSelector(interaction.selectors.getOriginForProvenance);
    const fileForDetailPanel = useSelector(interaction.selectors.getFileForDetailPanel);

    const fileDetails = origin ? fileForDetailPanel : selectedFile;
    return (
        <FileDetails
            className={classNames({ [styles.hideRight]: !!origin && !fileForDetailPanel })}
            fileDetails={fileDetails}
            isLoading={isLoading}
            onClose={
                origin ?
                    () => dispatch(interaction.actions.toggleFileDetailsPanel())
                    : undefined
            }
        />
    )
}
