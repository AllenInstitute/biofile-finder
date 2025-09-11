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
            key: "process-files-python",
            text: "Extract Standard Metadata (BioIO)",
            title:
                "Create a Python snippet that reads files with BioIO and exports standard metadata",
            iconProps: { iconName: "CodeEdit" },
            onClick() {
                dispatch(
                    interaction.actions.setVisibleModal(
                        ModalType.ProcessFilesCodeSnippet,
                        folderFilters
                    )
                );
            },
        },
    ];
}
