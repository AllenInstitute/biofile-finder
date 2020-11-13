import { Dialog, DialogFooter, PrimaryButton } from "office-ui-fabric-react";
import * as React from "react";
import { useDispatch, useSelector } from "react-redux";

import { interaction, metadata } from "../../state";
import { TOP_LEVEL_FILE_ANNOTATIONS } from "../../constants";
import AnnotationSelector from "../../components/AnnotationSelector";

const DIALOG_CONTENT_PROPS = {
    title: "Download CSV Manifest",
    subText: "Select which annotations you would like included as columns in the downloaded CSV",
};
const MODAL_PROPS = {
    isBlocking: false,
};

const TOP_LEVEL_FILE_ANNOTATION_SET = new Set(TOP_LEVEL_FILE_ANNOTATIONS.map((a) => a.displayName));

/**
 * Modal overlay for selecting columns to be included in a CSV manifest download of
 * files previously selected.
 */
export default function ManifestDownloadDialog() {
    const dispatch = useDispatch();
    const fileFilters = useSelector(interaction.selectors.getFileFiltersForManifestDownload);
    const customAnnotations = useSelector(metadata.selectors.getSortedAnnotations);
    const annotations = [...TOP_LEVEL_FILE_ANNOTATIONS, ...customAnnotations];
    const annotationNames = annotations.map((a) => a.name);
    const isVisible = useSelector(interaction.selectors.isManifestDownloadDialogVisible);
    const columnsSavedFromLastTime = useSelector(interaction.selectors.getCsvColumns);

    const defaultAnnotations = columnsSavedFromLastTime
        ? columnsSavedFromLastTime
        : [...TOP_LEVEL_FILE_ANNOTATION_SET];
    const [columns, setColumns] = React.useState<string[]>(defaultAnnotations);

    const onDownload = () => {
        dispatch(interaction.actions.setCsvColumns(columns));
        dispatch(interaction.actions.toggleManifestDownloadDialog());
        const columnSet = new Set(columns);
        // Map the annotations to their names (as opposed to their display names)
        // Top level file attributes as of the moment are automatically included
        const columnAnnotations = annotations
            .filter((a) => columnSet.has(a.displayName))
            .map((a) => a.name);

        // TODO: Why pass fileFilters if the logics could retrieve them...?
        dispatch(interaction.actions.downloadManifest(fileFilters, columnAnnotations));
    };

    return (
        <Dialog
            hidden={!isVisible}
            onDismiss={() => dispatch(interaction.actions.toggleManifestDownloadDialog())}
            dialogContentProps={DIALOG_CONTENT_PROPS}
            modalProps={MODAL_PROPS}
        >
            <AnnotationSelector
                annotations={columns}
                annotationOptions={annotationNames}
                setAnnotations={setColumns}
            />
            <DialogFooter>
                <PrimaryButton disabled={!columns.length} onClick={onDownload} text="Download" />
            </DialogFooter>
        </Dialog>
    );
}
