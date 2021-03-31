import { Label, PrimaryButton, TextField } from "@fluentui/react";
import { uniq, without } from "lodash";
import * as path from "path";
import * as React from "react";
import { useDispatch, useSelector } from "react-redux";
import { AnnotationName } from "../../../constants";

import { ExecutableEnvCancellationToken } from "../../../services";
import { interaction, selection } from "../../../state";
import { getContextMenuOnDismiss } from "../../../state/interaction/selectors";
import useAnnotationValues from "../../AnnotationFilterForm/useAnnotationValues";
import ListPicker, { ListItem } from "../../ListPicker";
import BaseModal from "../BaseModal";

const styles = require("./ApplicationSelection.module.css");

interface ApplicationSelectionModalProps {
    className?: string;
    onDismiss: () => void;
}

/**
 * Modal overlay for selecting an application to open already selected files with.
 * This modal additionally provides forms around making the selected application easier
 * to use in the future.
 */
export default function ApplicationSelection(props: ApplicationSelectionModalProps) {
    const dispatch = useDispatch();
    const [name, setName] = React.useState<string>("");
    const [filePath, setFilePath] = React.useState<string>("");
    const [defaultFileKinds, setDefaultFileKinds] = React.useState<string[]>([]);
    const fileSelection = useSelector(selection.selectors.getFileSelection);
    const annotationService = useSelector(interaction.selectors.getAnnotationService);
    const userSelectedApplications = useSelector(interaction.selectors.getKnownApplications);
    const { executionEnvService } = useSelector(interaction.selectors.getPlatformDependentServices);

    // Auto-select the file kinds repesented in the current file selection
    React.useEffect(() => {
        async function getFileKinds() {
            const selectedFilesDetails = await fileSelection.fetchAllDetails();
            const kinds = selectedFilesDetails.flatMap(
                (file) =>
                    file.annotations.find((a) => a.name === AnnotationName.KIND)?.values as string[]
            );
            setDefaultFileKinds(kinds);
        }
        getFileKinds();
    }, [fileSelection]);

    const [fileKinds, fileKindsIsLoading, errorMessage] = useAnnotationValues(
        AnnotationName.KIND,
        annotationService
    );

    const isAppNameTaken = userSelectedApplications.some((app) => app.name === name);
    const appsReplacedByKind = userSelectedApplications
        .filter((app) => app.defaultFileKinds.some((kind) => defaultFileKinds.includes(kind)))
        .map((app) => app.name)
        .join(", ");

    async function selectApplication() {
        const applicationSelected = await executionEnvService.promptForExecutable(
            "Select Application to Open Selected Files With"
        );
        if (applicationSelected && applicationSelected !== ExecutableEnvCancellationToken) {
            setName(path.basename(applicationSelected));
            setFilePath(applicationSelected);
        }
    }

    function onOpenFilesWithApplication() {
        const newApp = { name, filePath, defaultFileKinds };
        const existingApps = userSelectedApplications.map((app) => ({
            ...app,
            defaultFileKinds: defaultFileKinds.filter(
                (kind: string) => !defaultFileKinds.includes(kind)
            ),
        }));
        const apps = [...existingApps, newApp];
        dispatch(interaction.actions.setUserSelectedApplication(apps));
        dispatch(interaction.actions.openFilesWithApplication(newApp));
        props.onDismiss();
    }

    function onSelectFileKind(item: ListItem) {
        setDefaultFileKinds(uniq([...defaultFileKinds, item.value as string]));
    }

    function onDeselectFileKind(item: ListItem) {
        setDefaultFileKinds(without(defaultFileKinds, item.value as string));
    }

    const fileKindOptions = (fileKinds || []).map((value) => ({
        selected: defaultFileKinds.includes(value as string),
        displayValue: value,
        value,
    }));

    const modalBody = (
        <div className={props.className}>
            <p className={styles.helperText}>
                Browse for an application to open your selected files with. This application will be
                saved for easy access in the future.
            </p>
            {filePath && <p>{filePath}</p>}
            <div className={styles.browseButton}>
                <PrimaryButton text="Browse" onClick={selectApplication} />
            </div>
            {filePath && (
                <>
                    <TextField
                        autoFocus
                        label="Application Name"
                        value={name}
                        spellCheck={false}
                        onChange={(_, value) => setName(value || "")}
                    />
                    {isAppNameTaken && (
                        <p className={styles.errorText}>Already have application with same name</p>
                    )}
                    <Label>Kinds of Files to Open with This Application by Default</Label>
                    <ListPicker
                        className={styles.defaultFileKindPicker}
                        items={fileKindOptions}
                        loading={fileKindsIsLoading}
                        errorMessage={errorMessage}
                        onDeselect={onDeselectFileKind}
                        onSelect={onSelectFileKind}
                    />
                    {appsReplacedByKind && (
                        <p className={styles.helperText}>
                            Would replace {appsReplacedByKind} as default
                        </p>
                    )}
                </>
            )}
        </div>
    );

    return (
        <BaseModal
            body={modalBody}
            footer={
                <PrimaryButton
                    disabled={!filePath || isAppNameTaken}
                    onClick={onOpenFilesWithApplication}
                    text={filePath ? `Open with ${name}` : "Open with..."}
                />
            }
            onDismiss={props.onDismiss}
            title="Select Application to Open Selected Files With"
        />
    );
}
