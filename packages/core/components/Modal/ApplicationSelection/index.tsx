import { Dropdown, PrimaryButton, TextField } from "@fluentui/react";
import * as path from "path";
import * as React from "react";
import { useDispatch, useSelector } from "react-redux";
import { ExecutableEnvCancellationToken } from "../../../services";
import { interaction } from "../../../state";
import { getPlatformDependentServices } from "../../../state/interaction/selectors";
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
    const [title, setTitle] = React.useState<string>();
    const [filePath, setFilePath] = React.useState<string>();
    const [defaultFileKinds, setDefaultFileKinds] = React.useState<string[]>([]);
    const { executionEnvService } = useSelector(getPlatformDependentServices);
    const kinds: string[] = []; // TODO might need to async call to request these when this is opened

    async function selectApplication() {
        const applicationSelected = await executionEnvService.promptForExecutable(
            "Select Application to Open Selected Files With"
        );
        console.log("after selection");
        if (applicationSelected && applicationSelected !== ExecutableEnvCancellationToken) {
            setTitle(path.basename(applicationSelected));
            setFilePath(applicationSelected);
        }
    }

    const modalBody = (
        <>
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
                        value={title}
                        spellCheck={false}
                        onChange={(_, value) => setTitle(value || "")}
                    />
                    <Dropdown
                        label="(Optional) Default Kinds to Open File With"
                        // eslint-disable-next-line react/jsx-no-bind
                        onChange={(_, s) => setDefaultFileKinds((s as unknown) as string[])}
                        placeholder="Select default file kinds for future ease"
                        options={kinds.map((k) => ({ key: k, text: k }))}
                        selectedKey={defaultFileKinds}
                    />
                    <p className={styles.helperText}>
                        Select file kinds to set this application as the default for
                    </p>
                </>
            )}
        </>
    );

    return (
        <BaseModal
            body={modalBody}
            footer={
                <PrimaryButton
                    disabled={!filePath}
                    onClick={() =>
                        dispatch(
                            interaction.actions.saveApplicationSelection(
                                title || "",
                                filePath || "",
                                defaultFileKinds
                            )
                        )
                    }
                    text="Download"
                />
            }
            onDismiss={props.onDismiss}
            title="Select Application to Open Selected Files With"
        />
    );
}
