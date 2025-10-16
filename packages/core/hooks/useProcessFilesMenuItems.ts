import { IContextualMenuItem } from "@fluentui/react";
import { useDispatch } from "react-redux";

import { ModalType } from "../components/Modal";
import FileDetail from "../entity/FileDetail";
import FileFilter from "../entity/FileFilter";
import { interaction } from "../state";

/**
 * Build submenu items for the "Process files" context-menu group.
 */
export default function useProcessMenuItems(
    _fileDetails?: FileDetail,
    folderFilters?: FileFilter[]
): IContextualMenuItem[] {
    const dispatch = useDispatch();

    return [
        {
            key: "extract-metadata-python",
            text: "Extract standard metadata (BioIO)",
            title:
                "Create a Python snippet that reads files with BioIO and exports standard metadata",
            onClick() {
                dispatch(
                    interaction.actions.setVisibleModal(
                        ModalType.ExtractMetadataCodeSnippet,
                        folderFilters
                    )
                );
            },
        },
        {
            key: "convert-files-python",
            text: "Convert files to OME-Zarr (BioIO)",
            title: "Create a Python snippet that converts with BioIO",
            onClick() {
                dispatch(
                    interaction.actions.setVisibleModal(ModalType.ConvertFiles, folderFilters)
                );
            },
        },
    ];
}
