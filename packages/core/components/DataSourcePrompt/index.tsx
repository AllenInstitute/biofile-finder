import classNames from "classnames";
import * as React from "react";
import { useDispatch, useSelector } from "react-redux";

import DataSourcePromptTemplate from "./DataSourcePromptTemplate";
import FilePrompt from "./FilePrompt";
import { LinkLikeButton, TransparentIconButton } from "../Buttons";
import { Source } from "../../entity/SearchParams";
import { interaction, selection } from "../../state";
import { DataSourcePromptInfo } from "../../state/interaction/actions";

import styles from "./DataSourcePrompt.module.css";

interface Props {
    className?: string;
    isModal?: boolean;
}

interface PropsDefaultType extends Props {
    metadataSource?: Source;
    provenanceSource?: Source;
    setMetadataSource: (file?: Source) => void;
    setProvenanceSource: (file?: Source) => void;
    onDismiss: () => void;
}

export enum DataSourceType {
    default = 0,
    metadata = 1,
    provenance = 2,
}

/**
 * Dialog meant to prompt user to select a data source option
 */
export default function DataSourcePrompt(props: Props) {
    const dispatch = useDispatch();
    const dataSourceInfo = useSelector(interaction.selectors.getDataSourceInfoForVisibleModal);
    const { source, sourceType = DataSourceType.default } =
        dataSourceInfo || ({} as DataSourcePromptInfo);
    const [metadataSource, setMetadataSource] = React.useState<Source>();
    const [provenanceSource, setProvenanceSource] = React.useState<Source>();

    const onDismiss = () => {
        dispatch(interaction.actions.hideVisibleModal());
    };

    if (sourceType === DataSourceType.metadata) {
        let description =
            "Load a CSV, Parquet, or JSON file containing metadata descriptors associated with the columns in your data source.\n";
        if (source) {
            description = description.concat(
                `\nUploading a new file will replace the current metadata source (${source.name}).`
            );
        }
        return (
            <DataSourcePromptTemplate
                className={props.className}
                description={description}
                isModal={props.isModal}
                onSubmit={() => {
                    if (!metadataSource) return;
                    dispatch(selection.actions.changeSourceMetadata(metadataSource));
                    onDismiss();
                }}
                onSelectFile={setMetadataSource}
                selectedFile={metadataSource}
                submitDisabled={!metadataSource}
            />
        );
    } else if (sourceType === DataSourceType.provenance) {
        let description =
            "Load a CSV, Parquet, or JSON file describing provenance relationships associated with the columns in your data source.\n";
        if (source) {
            description = description.concat(
                `\nUploading a new file will replace the current provenance source (${source.name}).`
            );
        }
        return (
            <DataSourcePromptTemplate
                className={props.className}
                description={description}
                isModal={props.isModal}
                onSubmit={() => {
                    if (!provenanceSource) return;
                    dispatch(selection.actions.changeProvenanceSource(provenanceSource));
                    onDismiss();
                }}
                onSelectFile={setProvenanceSource}
                selectedFile={provenanceSource}
                submitDisabled={!provenanceSource}
            />
        );
    }
    return (
        <DataSourcePromptDefault
            className={props.className}
            isModal={props.isModal}
            metadataSource={metadataSource}
            setMetadataSource={setMetadataSource}
            provenanceSource={provenanceSource}
            setProvenanceSource={setProvenanceSource}
            onDismiss={onDismiss}
        />
    );
}

function DataSourcePromptDefault(props: PropsDefaultType) {
    const dispatch = useDispatch();
    const { metadataSource, setMetadataSource, provenanceSource, setProvenanceSource } = props;
    const dataSourceInfo = useSelector(interaction.selectors.getDataSourceInfoForVisibleModal);
    const { query } = dataSourceInfo || ({} as DataSourcePromptInfo);
    const selectedDataSources = useSelector(selection.selectors.getSelectedDataSources);
    const requiresDataSourceReload = useSelector(selection.selectors.getRequiresDataSourceReload);
    const [dataSource, setDataSource] = React.useState<Source>();
    const [showMetadataPrompt, setShowMetadataPrompt] = React.useState(false);
    const [showProvenancePrompt, setShowProvenancePrompt] = React.useState(false);

    const onSubmit = () => {
        if (!dataSource) return;
        if (requiresDataSourceReload || query) {
            if (metadataSource) {
                dispatch(selection.actions.changeSourceMetadata(metadataSource));
            }
            if (provenanceSource) {
                dispatch(selection.actions.changeProvenanceSource(provenanceSource));
            }

            if (requiresDataSourceReload) {
                dispatch(selection.actions.replaceDataSource(dataSource));
            } else {
                dispatch(selection.actions.changeDataSources([...selectedDataSources, dataSource]));
            }
        } else {
            // brand new query
            dispatch(
                selection.actions.addQuery({
                    name: `New ${dataSource.name} Query`,
                    parts: {
                        sources: [dataSource],
                        sourceMetadata: metadataSource,
                        provenanceSource: provenanceSource,
                    },
                    loading: true,
                })
            );
        }

        props.onDismiss();
    };

    const metadataDescriptorPrompt = (
        <div
            className={classNames(
                styles.fullWidth,
                metadataSource ? styles.advancedOptionsFilled : styles.advancedOptionsEmpty
            )}
        >
            {!metadataSource && (
                <div className={styles.advancedOptionsHeader}>
                    <h4 className={styles.fullWidth}>Add metadata descriptor file (optional)</h4>
                    <TransparentIconButton
                        className={styles.iconButton}
                        iconName="Cancel"
                        onClick={() => {
                            setMetadataSource(undefined);
                            setShowMetadataPrompt(false);
                        }}
                    />
                </div>
            )}
            <div className={styles.filePromptWrapper}>
                <FilePrompt
                    className={classNames(styles.filePrompt, styles.filePromptWide)}
                    onSelectFile={setMetadataSource}
                    selectedFile={metadataSource}
                    parentId={`file-prompt-metadata-${props.isModal ? "modal" : "main"}`}
                    fileLabel={"Metadata descriptor file: "}
                    lightBackground={props.isModal}
                />
            </div>
        </div>
    );

    const provenanceFilePrompt = (
        <div
            className={classNames(
                styles.fullWidth,
                provenanceSource ? styles.advancedOptionsFilled : styles.advancedOptionsEmpty
            )}
        >
            {!provenanceSource && (
                <div className={styles.advancedOptionsHeader}>
                    <h4 className={styles.fullWidth}>Add provenance descriptor file (optional)</h4>
                    <TransparentIconButton
                        className={styles.iconButton}
                        iconName="Cancel"
                        onClick={() => {
                            setProvenanceSource(undefined);
                            setShowProvenancePrompt(false);
                        }}
                    />
                </div>
            )}
            <div className={styles.filePromptWrapper}>
                <FilePrompt
                    className={classNames(styles.filePrompt, styles.filePromptWide)}
                    onSelectFile={setProvenanceSource}
                    selectedFile={provenanceSource}
                    parentId={`file-prompt-provenance-${props.isModal ? "modal" : "main"}`}
                    fileLabel={"Provenance descriptor file: "}
                    lightBackground={props.isModal}
                />
            </div>
        </div>
    );

    return (
        <DataSourcePromptTemplate
            className={props.className}
            description="Load a CSV, Parquet, or JSON file containing the metadata key-value pairs (annotations) associated with your files."
            isModal={props.isModal}
            onSubmit={onSubmit}
            onSelectFile={setDataSource}
            selectedFile={dataSource}
            submitDisabled={!dataSource}
            showAdvancedOptions
            title="Choose a data source"
        >
            <>
                <div className={styles.advancedOptionsButtons}>
                    {!(showMetadataPrompt && showProvenancePrompt) && <p>Optional includes: </p>}
                    {!showMetadataPrompt && (
                        <LinkLikeButton
                            className={styles.advancedOptionsButton}
                            onClick={() => setShowMetadataPrompt(!showMetadataPrompt)}
                            text="Metadata descriptor file"
                            title="Select a file that describes your metadata columns"
                        />
                    )}
                    {!(showMetadataPrompt || showProvenancePrompt) && <p>|</p>}
                    {!showProvenancePrompt && (
                        <LinkLikeButton
                            className={styles.advancedOptionsButton}
                            onClick={() => setShowProvenancePrompt(!showProvenancePrompt)}
                            text="Provenance descriptor file"
                            title="Select a file that describes provenance relationships"
                        />
                    )}
                </div>
                {showMetadataPrompt && metadataDescriptorPrompt}
                {showProvenancePrompt && provenanceFilePrompt}
            </>
        </DataSourcePromptTemplate>
    );
}
