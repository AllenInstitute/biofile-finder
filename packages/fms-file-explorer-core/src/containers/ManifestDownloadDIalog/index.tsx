import {
    Dialog,
    DialogFooter,
    PrimaryButton,
    DefaultButton,
    Dropdown,
    IDropdownOption,
    Checkbox,
    Icon,
    Label,
} from "office-ui-fabric-react";
import * as React from "react";
import { useDispatch, useSelector } from "react-redux";

import { interaction, metadata } from "../../state";
import { TOP_LEVEL_FILE_ANNOTATIONS } from "../../constants";

const styles = require("./ManifestDownloadDialog.module.css");

const DIALOG_CONTENT_PROPS = {
    title: "Download CSV Manifest",
    subText: "Select which annotations you would like included as columns in the downloaded CSV",
};
const MODAL_PROPS = {
    isBlocking: false,
};

const SAVED_CSV_COLUMNS_STORAGE = "SAVED_CSV_COLUMNS_STORAGE";

/**
 * Modal overlay for selecting columns to be included in a CSV manifest download of
 * files previously selected.
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

    const [shouldSaveColumnSelection, setShouldSaveColumnSelection] = React.useState(true);
    const [columns, setColumns] = React.useState<string[]>(
        TOP_LEVEL_FILE_ANNOTATIONS.map((a) => a.displayName)
    );
    // Retrieve and set the columns saved to local state from last time (if exists)
    React.useEffect(() => {
        const columnsSavedFromLastTime = localStorage.getItem(SAVED_CSV_COLUMNS_STORAGE);
        if (columnsSavedFromLastTime) {
            const parsedColumns = JSON.parse(columnsSavedFromLastTime);
            if (parsedColumns.length) {
                const parsedColumnSet = new Set(parsedColumns);
                const matchingAnnotations = annotations
                    .filter((a) => parsedColumnSet.has(a.name))
                    .map((a) => a.displayName);
                if (matchingAnnotations.length) {
                    setColumns(matchingAnnotations);
                }
            }
        }
    }, []);

    const removeColumn = (column: string) => {
        const filteredColumns = columns.filter((c) => c !== column);
        setColumns(filteredColumns);
    };
    const onChange = (_: React.FormEvent<HTMLDivElement>, option?: IDropdownOption | undefined) => {
        if (option) {
            const column = option.key as string;
            const columnSet = new Set(columns);
            if (columnSet.has(column)) {
                removeColumn(column);
            } else {
                const matchingColumn = annotations.filter((a) => a.name === column)[0].displayName;
                setColumns([...columns, matchingColumn].sort((a, b) => a.localeCompare(b)));
            }
        }
    };
    const onDownload = () => {
        if (shouldSaveColumnSelection) {
            localStorage.setItem(SAVED_CSV_COLUMNS_STORAGE, JSON.stringify(columns));
        }
        dispatch(interaction.actions.toggleManifestDownloadDialog());
        dispatch(interaction.actions.downloadManifest(fileFilters, columns));
    };

    return (
        <Dialog
            hidden={!isManifestDownloadDialogVisible}
            onDismiss={() => dispatch(interaction.actions.toggleManifestDownloadDialog())}
            dialogContentProps={DIALOG_CONTENT_PROPS}
            modalProps={MODAL_PROPS}
        >
            <DefaultButton
                onClick={() => setColumns(annotations.map((a) => a.displayName))}
                text="Select All"
            />
            <DefaultButton onClick={() => setColumns([])} text="Select None" />
            <Dropdown
                multiSelect
                className={styles.columnDropdown}
                placeholder="Select columns"
                label="Columns"
                selectedKeys={columns}
                onChange={onChange}
                options={annotations.map((a) => ({ key: a.displayName, text: a.displayName }))}
            />
            <Label>Selected Columns ({columns.length} total)</Label>
            <ul className={styles.columnList}>
                {columns.map((column) => (
                    <li key={column}>
                        {column}
                        <Icon
                            className={styles.columnListIcon}
                            iconName="clear"
                            onClick={() => removeColumn(column)}
                        />
                    </li>
                ))}
            </ul>
            <Checkbox
                checked={shouldSaveColumnSelection}
                label="Save column selection for next time"
                onChange={() => setShouldSaveColumnSelection(!shouldSaveColumnSelection)}
            />
            <DialogFooter>
                <PrimaryButton disabled={!columns.length} onClick={onDownload} text="Download" />
            </DialogFooter>
        </Dialog>
    );
}
