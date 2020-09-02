import classNames from "classnames";
import { find } from "lodash";
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
    const annotations = useSelector(metadata.selectors.getSortedAnnotations);
    const fileFilters = useSelector(interaction.selectors.getFileFiltersForManifestDownload);
    const { persistentConfigService } = useSelector(
        interaction.selectors.getPlatformDependentServices
    );
    const isManifestDownloadDialogVisible = useSelector(
        interaction.selectors.isManifestDownloadDialogVisible
    );

    const [columns, setColumns] = React.useState<string[]>([]);
    const columnSet = new Set(columns);
    // Retrieve and set the columns saved to local state from last time (if exists)
    React.useEffect(() => {
        const columnsSavedFromLastTime = persistentConfigService.get(SAVED_CSV_COLUMNS_STORAGE);
        if (
            columnsSavedFromLastTime &&
            Array.isArray(columnsSavedFromLastTime) &&
            columnsSavedFromLastTime.length
        ) {
            setColumns(columnsSavedFromLastTime);
        }
    }, [annotations, persistentConfigService]);

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
                const matchingColumn = find(annotations, (a) => a.displayName === column);
                matchingColumn && setColumns([...columns, matchingColumn.displayName].sort());
            }
        }
    };
    const onDownload = () => {
        persistentConfigService.set(SAVED_CSV_COLUMNS_STORAGE, columns);
        dispatch(interaction.actions.toggleManifestDownloadDialog());
        // Map the annotations to their names (as opposed to their display names)
        const columnAnnotations = annotations.filter((a) => columnSet.has(a.displayName));
        // Top level file attributes as of the moment must always be included
        const csvColumns = [...columnAnnotations, ...TOP_LEVEL_FILE_ANNOTATIONS].map((a) => a.name);
        dispatch(interaction.actions.downloadManifest(fileFilters, csvColumns));
    };

    return (
        <Dialog
            hidden={!isManifestDownloadDialogVisible}
            onDismiss={() => dispatch(interaction.actions.toggleManifestDownloadDialog())}
            dialogContentProps={DIALOG_CONTENT_PROPS}
            modalProps={MODAL_PROPS}
        >
            <DefaultButton
                disabled={columns.length === annotations.length}
                onClick={() => setColumns(annotations.map((a) => a.displayName))}
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
                disabled={annotations.length === columns.length}
                label="Additional Columns"
                onChange={addColumn}
                options={annotations.map((a) => ({ key: a.displayName, text: a.displayName }))}
                placeholder="Add more columns"
                selectedKeys={columns}
                styles={{ dropdownItemsWrapper: { maxHeight: "250px" } }}
            />
            <Label>
                Selected Columns ({columns.length + TOP_LEVEL_FILE_ANNOTATIONS.length} total)
            </Label>
            <ul className={styles.columnList}>
                {TOP_LEVEL_FILE_ANNOTATIONS.map((annotation) => (
                    <li
                        className={classNames(styles.listItem, styles.topLevelAnnotationItem)}
                        key={annotation.name}
                    >
                        {annotation.displayName}
                        <span className={styles.topLevelAnnotationItemText}>(required)</span>
                    </li>
                ))}
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
                <PrimaryButton onClick={onDownload} text="Download" />
            </DialogFooter>
        </Dialog>
    );
}
