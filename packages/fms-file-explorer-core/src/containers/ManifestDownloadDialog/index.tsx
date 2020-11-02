import {
    Dialog,
    DialogFooter,
    PrimaryButton,
    DefaultButton,
    Dropdown,
    IDropdownOption,
    Icon,
    Label,
} from "office-ui-fabric-react";
import * as React from "react";
import { useDispatch, useSelector } from "react-redux";

import { interaction, metadata, selection } from "../../state";
import { TOP_LEVEL_FILE_ANNOTATIONS } from "../../constants";
import { PersistedConfigKeys } from "../../services/PersistentConfigService";

const styles = require("./ManifestDownloadDialog.module.css");

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
    const customAnnotations = useSelector(metadata.selectors.getSortedAnnotations);
    const allAnnotations = [...TOP_LEVEL_FILE_ANNOTATIONS, ...customAnnotations];
    const fileFilters = useSelector(interaction.selectors.getFileFiltersForManifestDownload);
    const { persistentConfigService } = useSelector(
        interaction.selectors.getPlatformDependentServices
    );
    const persistedConfig = useSelector(selection.selectors.getPersistedConfig);
    const columnsSavedFromLastTime = persistedConfig.CSV_COLUMNS;
    const isManifestDownloadDialogVisible = useSelector(
        interaction.selectors.isManifestDownloadDialogVisible
    );

    const [columns, setColumns] = React.useState<string[]>([...TOP_LEVEL_FILE_ANNOTATION_SET]);
    const columnSet = new Set(columns);
    // Retrieve and set the columns saved to local state from last time (if exists)
    React.useEffect(() => {
        if (
            columnsSavedFromLastTime &&
            Array.isArray(columnsSavedFromLastTime) &&
            columnsSavedFromLastTime.length
        ) {
            const annotationSet = new Set(
                [...TOP_LEVEL_FILE_ANNOTATIONS, ...customAnnotations].map((a) => a.displayName)
            );
            setColumns(columnsSavedFromLastTime.filter((c) => annotationSet.has(c)));
        }
    }, [customAnnotations, columnsSavedFromLastTime]);

    const removeColumn = (column: string) => {
        setColumns(columns.filter((c) => c !== column));
    };
    const addColumn = (
        _: React.FormEvent<HTMLDivElement>,
        option?: IDropdownOption | undefined
    ) => {
        if (option) {
            const column = option.key as string;
            if (columnSet.has(column)) {
                removeColumn(column);
            } else {
                // Place the "top level file attributes" at the top of the selected column list
                setColumns(
                    [...columns, column].sort((a, b) => {
                        if (TOP_LEVEL_FILE_ANNOTATION_SET.has(a)) {
                            if (!TOP_LEVEL_FILE_ANNOTATION_SET.has(b)) {
                                return -1;
                            }
                        } else if (TOP_LEVEL_FILE_ANNOTATION_SET.has(b)) {
                            return 1;
                        }
                        return a.localeCompare(b);
                    })
                );
            }
        }
    };
    const onDownload = () => {
        persistentConfigService.set(PersistedConfigKeys.CsvColumns, columns);
        dispatch(interaction.actions.toggleManifestDownloadDialog());
        // Map the annotations to their names (as opposed to their display names)
        // Top level file attributes as of the moment are automatically included
        const columnAnnotations = allAnnotations
            .filter((a) => columnSet.has(a.displayName))
            .map((a) => a.name);
        dispatch(interaction.actions.downloadManifest(fileFilters, columnAnnotations));
    };

    return (
        <Dialog
            hidden={!isManifestDownloadDialogVisible}
            onDismiss={() => dispatch(interaction.actions.toggleManifestDownloadDialog())}
            dialogContentProps={DIALOG_CONTENT_PROPS}
            modalProps={MODAL_PROPS}
        >
            <DefaultButton
                disabled={columns.length === allAnnotations.length}
                onClick={() => setColumns(allAnnotations.map((a) => a.displayName))}
                text="Select All"
            />
            <DefaultButton
                disabled={!columns.length}
                onClick={() => setColumns([])}
                text="Select None"
            />
            <Dropdown
                multiSelect
                className={styles.columnDropdown}
                disabled={columns.length === allAnnotations.length}
                label="Columns"
                onChange={addColumn}
                options={[...TOP_LEVEL_FILE_ANNOTATIONS, ...customAnnotations].map((a) => ({
                    key: a.displayName,
                    text: a.displayName,
                }))}
                placeholder="Select columns to include"
                selectedKeys={columns}
                styles={{ dropdownItemsWrapper: { maxHeight: "250px" } }}
            />
            <Label>Selected Columns ({columns.length} total)</Label>
            <ul className={styles.columnList}>
                {columns.map((column) => (
                    <li className={styles.listItem} key={column}>
                        <Icon
                            className={styles.columnListIcon}
                            iconName="clear"
                            onClick={() => removeColumn(column)}
                            data-testid="column-deselect-icon"
                        />
                        {column}
                    </li>
                ))}
            </ul>
            <DialogFooter>
                <PrimaryButton disabled={!columns.length} onClick={onDownload} text="Download" />
            </DialogFooter>
        </Dialog>
    );
}
