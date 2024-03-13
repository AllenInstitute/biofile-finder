import {
    ActionButton,
    DefaultButton,
    Icon,
    Spinner,
    SpinnerSize,
    TextField,
} from "@fluentui/react";
import { debounce } from "lodash";
import * as React from "react";
import { useDispatch, useSelector } from "react-redux";

import { ModalProps } from "..";
import BaseModal from "../BaseModal";
import { interaction, metadata, selection } from "../../../state";

import styles from "./DataSourcePrompt.module.css";

interface Props extends ModalProps {
    isEditing?: boolean;
}

const DATA_SOURCE_DETAILS = [
    "The files must contain at least the following columns: 'file_name', 'file_size', 'file_path', 'file_id', and 'uploaded' & must be unique by the 'file_path' column. Any other columns are optional and will be available as annotations to query by.",
    "The 'file_path' column should contain the full path to the file in the cloud storage. The 'file_id' column should contain a unique identifier for the file. The 'uploaded' column should contain the date the file was uploaded to the cloud storage.",
    'Data source files can be generating by this application by selecting some files, right-clicking, and selecting the "Generate CSV Manifest" option.å',
];

/**
 * Dialog meant to prompt user to select a data source option
 */
export default function DataSourcePrompt({ onDismiss }: Props) {
    const dispatch = useDispatch();
    const fileExplorerServiceBaseUrl = useSelector(
        interaction.selectors.getFileExplorerServiceBaseUrl
    );
    const { databaseService } = useSelector(interaction.selectors.getPlatformDependentServices);
    const lastUsedCollection = useSelector(interaction.selectors.getLastUsedCollection);
    const collections = useSelector(metadata.selectors.getCollections);
    const annotations = useSelector(metadata.selectors.getAnnotations);
    const [isCheckingForDataSource, setIsCheckingForDataSource] = React.useState(true);

    const [dataSourceURL, setDataSourceURL] = React.useState("");
    const [isAICSEmployee, setIsAICSEmployee] = React.useState(false);
    const [isDataSourceDetailExpanded, setIsDataSourceDetailExpanded] = React.useState(false);

    const loadDataFromURI = React.useCallback(
        async (uri: string) => {
            const response = await databaseService.getDataSource(uri);
            dispatch(
                selection.actions.changeCollection({
                    uri,
                    id: response.name,
                    name: response.name,
                    version: 1,
                    query: "",
                    client: "",
                    fixed: true,
                    private: true,
                    created: response.created,
                    createdBy: "Unknown",
                })
            );
            onDismiss();
        },
        [databaseService, dispatch, onDismiss]
    );
    React.useEffect(() => {
        if (lastUsedCollection) {
            const matchingCollection = collections.find((c) => c.id === lastUsedCollection.id);
            if (matchingCollection) {
                dispatch(selection.actions.changeCollection(matchingCollection));
                onDismiss();
            } else if (lastUsedCollection.uri) {
                loadDataFromURI(lastUsedCollection.uri);
            }
        }

        // If we found annotations at a data source we are good to go
        if (annotations.length) {
            onDismiss();
        }
        setIsCheckingForDataSource(false);
    }, [
        lastUsedCollection,
        loadDataFromURI,
        annotations,
        collections,
        databaseService,
        dispatch,
        onDismiss,
        fileExplorerServiceBaseUrl,
    ]);

    const onChooseFile = () => {
        dispatch(interaction.actions.browseForCollectionSource());
    };
    const onEnterURL = debounce(
        (evt: React.FormEvent) => {
            evt.preventDefault();
            loadDataFromURI(dataSourceURL);
        },
        1000,
        { leading: true, trailing: false }
    );
    const onIsAllenEmployee = debounce(
        () => {
            setIsAICSEmployee(!isAICSEmployee);
            dispatch(interaction.actions.refresh());
        },
        1000,
        { leading: true, trailing: false }
    );

    if (isCheckingForDataSource) {
        const modalBody = <Spinner size={SpinnerSize.large} />;
        return (
            <BaseModal
                isBlocking
                body={modalBody}
                title="Checking for data source..."
                onDismiss={undefined}
            />
        );
    }

    const body = (
        <>
            <p className={styles.text}>
                Please provide a &quot;.csv&quot;, &quot;.parquet&quot;, or &quot;.json&quot; file
                containing metadata about some files. See more details for information about what a
                data source file should look like...
            </p>
            {isDataSourceDetailExpanded ? (
                <div>
                    {DATA_SOURCE_DETAILS.map((text) => (
                        <p key={text} className={styles.text}>
                            {text}
                        </p>
                    ))}
                    <div className={styles.subtitleButtonContainer}>
                        <DefaultButton
                            className={styles.subtitleButton}
                            onClick={() => setIsDataSourceDetailExpanded(false)}
                        >
                            LESS&nbsp;
                            <Icon iconName="CaretSolidUp" />
                        </DefaultButton>
                    </div>
                </div>
            ) : (
                <div className={styles.subtitleButtonContainer}>
                    <DefaultButton
                        className={styles.subtitleButton}
                        onClick={() => setIsDataSourceDetailExpanded(true)}
                    >
                        MORE&nbsp;
                        <Icon iconName="CaretSolidDown" />
                    </DefaultButton>
                </div>
            )}
            <div className={styles.actionsContainer}>
                <DefaultButton
                    className={styles.browseButton}
                    ariaLabel="Browse for a data source file on your machine"
                    iconProps={{ iconName: "DocumentSearch" }}
                    onClick={onChooseFile}
                    text="Choose File"
                    title="Browse for a data source file on your machine"
                />
                <div className={styles.orDivider}>
                    <hr />
                    or
                    <hr />
                </div>
                <form className={styles.urlForm} onSubmit={onEnterURL}>
                    <TextField
                        onChange={(_, newValue) => setDataSourceURL(newValue || "")}
                        placeholder="Paste URL (ex. S3, Azure)"
                        value={dataSourceURL}
                    />
                </form>
            </div>
        </>
    );
    const footer = isAICSEmployee ? (
        <p>
            Unable to connect to necessary server in the Allen Institute network. Check WiFi or VPN
            connection.
        </p>
    ) : (
        <ActionButton
            allowDisabledFocus
            className={styles.aiEmployeePrompt}
            onClick={onIsAllenEmployee}
        >
            Allen Institute employee?
        </ActionButton>
    );

    return (
        <BaseModal
            isBlocking
            body={body}
            footer={footer}
            title="Choose a data source"
            onDismiss={undefined}
        />
    );
}
