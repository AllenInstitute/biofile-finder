import { PrimaryButton } from "@fluentui/react";
import { isEmpty } from "lodash";
import * as React from "react";
import { useDispatch, useSelector } from "react-redux";

import { ModalProps } from "..";
import BaseModal from "../BaseModal";
import AnnotationSelector from "../AnnotationSelector";
import { TOP_LEVEL_FILE_ANNOTATIONS } from "../../../constants";
import Annotation from "../../../entity/Annotation";
import * as modalSelectors from "../selectors";
import { interaction } from "../../../state";

/**
 * Modal overlay for selecting columns to be included in a CSV manifest download of
 * files previously selected.
 */
export default function CsvManifest({ onDismiss }: ModalProps) {
    const dispatch = useDispatch();

    const annotationsPreviouslySelected = useSelector(
        modalSelectors.getAnnotationsPreviouslySelected
    );
    const [selectedAnnotations, setSelectedAnnotations] = React.useState<Annotation[]>(() =>
        isEmpty(annotationsPreviouslySelected)
            ? [...TOP_LEVEL_FILE_ANNOTATIONS]
            : annotationsPreviouslySelected
    );

    const onDownload = () => {
        onDismiss();
        dispatch(interaction.actions.downloadManifest(selectedAnnotations));
    };

    const body = (
        <>
            <p>Select which annotations you would like included as columns in the downloaded CSV</p>
            <AnnotationSelector
                selections={selectedAnnotations}
                setSelections={setSelectedAnnotations}
            />
        </>
    );

    return (
        <BaseModal
            body={body}
            footer={
                <PrimaryButton
                    disabled={!selectedAnnotations.length}
                    onClick={onDownload}
                    text="Download"
                />
            }
            onDismiss={onDismiss}
            title="Download CSV Manifest"
        />
    );
}
