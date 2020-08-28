import {
    IContextualMenuItem,
    Target,
    ContextualMenuItemType as _ContextualMenuItemType,
    Dialog,
    DialogFooter,
    PrimaryButton,
    DefaultButton,
    DialogType,
} from "office-ui-fabric-react";
import * as React from "react";
import { useDispatch, useSelector } from "react-redux";

import { interaction, metadata } from "../../state";
import { toggleManifestDownloadDialog } from "../../state/interaction/actions";

export type ContextMenuItem = IContextualMenuItem;
export type PositionReference = Target;
export const ContextualMenuItemType = _ContextualMenuItemType;

const DIALOG_CONTENT_PROPS = {
    type: DialogType.largeHeader,
    title: "Download CSV Manifest",
    subText: "Select which annotations you would like included as columns in the downloaded CSV",
};
const MODAL_PROPS = {
    isBlocking: false,
    styles: { main: { maxWidth: 450 } },
};

/**
 * TODO
 */
export default function ManifestDownloadDialog() {
    const dispatch = useDispatch();
    const annotations = useSelector(metadata.selectors.getAnnotations);
    const isManifestDownloadDialogVisible = useSelector(
        interaction.selectors.isManifestDownloadDialogVisible
    );
    const fileFilters = useSelector(interaction.selectors.getFileFiltersForManifestDownload);

    const [columns, setColumns] = React.useState<string[]>([]);

    // TODO: add something to control list of annotations to add...
    const selectAll = () => {
        const annotationNames = annotations.map((a) => a.name);
        setColumns(annotationNames);
    };
    const selectNone = () => {
        setColumns([]);
    };
    const onDownload = () => {
        dispatch(toggleManifestDownloadDialog([]));
        dispatch(interaction.actions.downloadManifest(fileFilters, columns));
    };

    return (
        <Dialog
            hidden={!isManifestDownloadDialogVisible}
            onDismiss={() => dispatch(toggleManifestDownloadDialog([]))}
            dialogContentProps={DIALOG_CONTENT_PROPS}
            modalProps={MODAL_PROPS}
        >
            <DialogFooter>
                <DefaultButton onClick={selectAll} text="Select All" />
                <DefaultButton onClick={selectNone} text="Select None" />
                <PrimaryButton onClick={onDownload} text="Download" />
            </DialogFooter>
        </Dialog>
    );
}
