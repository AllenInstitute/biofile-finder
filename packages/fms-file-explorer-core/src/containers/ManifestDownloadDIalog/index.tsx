import {
    IContextualMenuItem,
    Target,
    ContextualMenuItemType as _ContextualMenuItemType,
    Dialog,
    DialogFooter,
    PrimaryButton,
    DefaultButton,
    Dropdown,
    IDropdownOption,
} from "office-ui-fabric-react";
import * as React from "react";
import { useDispatch, useSelector } from "react-redux";

import { interaction, metadata } from "../../state";
import { TOP_LEVEL_FILE_ANNOTATIONS } from "../../constants";
import Annotation from "../../entity/Annotation";

export type ContextMenuItem = IContextualMenuItem;
export type PositionReference = Target;
export const ContextualMenuItemType = _ContextualMenuItemType;

const DIALOG_CONTENT_PROPS = {
    title: "Download CSV Manifest",
    subText: "Select which annotations you would like included as columns in the downloaded CSV",
};
const MODAL_PROPS = {
    isBlocking: false,
    // styles: { main: { maxWidth: 450 } },
};

/**
 * TODO
 */
export default function ManifestDownloadDialog() {
    const dispatch = useDispatch();
    const annotations = [
        ...TOP_LEVEL_FILE_ANNOTATIONS,
        ...useSelector(metadata.selectors.getSortedAnnotations),
    ];
    const isManifestDownloadDialogVisible = useSelector(
        interaction.selectors.isManifestDownloadDialogVisible
    );
    const fileFilters = useSelector(interaction.selectors.getFileFiltersForManifestDownload);

    const [columns, setColumns] = React.useState<Annotation[]>(TOP_LEVEL_FILE_ANNOTATIONS);
    const columnAnnotationNames = columns.map((column) => column.name);
    const columnAnnotationNameSet = new Set(columns.map((column) => column.name));

    const onDownload = () => {
        dispatch(interaction.actions.toggleManifestDownloadDialog());
        dispatch(interaction.actions.downloadManifest(fileFilters, columnAnnotationNames));
    };
    const onChange = (
        event: React.FormEvent<HTMLDivElement>,
        option?: IDropdownOption | undefined
    ) => {
        console.log(event);
        console.log(option);
        console.log(columns);
        if (option) {
            // If has already been selected, deselect it
            if (columnAnnotationNameSet.has(option.key as string)) {
                const filteredColumns = columns.filter((c) => c.name !== option.key);
                setColumns(filteredColumns);
            } else {
                const matchingColumn = annotations.filter((a) => a.name === option.key)[0];
                setColumns([...columns, matchingColumn]);
            }
        }
    };

    return (
        <Dialog
            hidden={!isManifestDownloadDialogVisible}
            onDismiss={() => dispatch(interaction.actions.toggleManifestDownloadDialog())}
            dialogContentProps={DIALOG_CONTENT_PROPS}
            modalProps={MODAL_PROPS}
        >
            <DefaultButton onClick={() => setColumns(annotations)} text="Select All" />
            <DefaultButton onClick={() => setColumns([])} text="Select None" />
            <Dropdown
                multiSelect
                placeholder="Select or deselect a column"
                label="Columns"
                selectedKeys={columns.map((c) => c.name)}
                onChange={onChange}
                options={annotations.map((a) => ({ key: a.name, text: a.displayName }))}
            />
            <DialogFooter>
                <PrimaryButton onClick={onDownload} text="Download" />
            </DialogFooter>
        </Dialog>
    );
}
