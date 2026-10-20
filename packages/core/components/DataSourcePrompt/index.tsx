import classNames from "classnames";
import * as React from "react";
import { useDispatch, useSelector } from "react-redux";

import DataSourcePromptTemplate from "./DataSourcePromptTemplate";
import FilePrompt from "./FilePrompt";
import { LinkLikeButton, TransparentIconButton } from "../Buttons";
import Tooltip from "../Tooltip";
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

const COLUMN_DESCRIPTOR_TOOLTIP = "Select a file that describes your metadata columns";
const PROVENANCE_DESCRIPTOR_TOOLTIP =
    "Select a file that describes file and metadata relationships";

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
            "Provide a column descriptor file (CSV, Parquet, or JSON) describing your metadata columns.\n";
        if (source) {
            description = description.concat(
                `\nUploading a new file will replace the current column descriptor file (${source.name}).`
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
            "Provide a provenance descriptor file (CSV, Parquet, or JSON) describing file and metadata relationships.\n";
        if (source) {
            description = description.concat(
                `\nUploading a new file will replace the current provenance descriptor file (${source.name}).`
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

    return (
        <DataSourcePromptTemplate
            className={props.className}
            description="Provide a metadata file (CSV, Parquet, or JSON) describing your dataset. Once loaded, it becomes a searchable data source that you can query, filter, and explore."
            isModal={props.isModal}
            onSubmit={onSubmit}
            onSelectFile={setDataSource}
            selectedFile={dataSource}
            submitDisabled={!dataSource}
            showGuidanceLink
            title="Provide a metadata file"
        >
            {dataSource && (
                <>
                    <div className={styles.advancedOptionsButtons}>
                        <p>Describe columns with supplemental metadata (optional):</p>
                        {!showMetadataPrompt && (
                            <Tooltip content={COLUMN_DESCRIPTOR_TOOLTIP}>
                                <LinkLikeButton
                                    className={styles.advancedOptionsButton}
                                    onClick={() => setShowMetadataPrompt(true)}
                                    text="Column descriptor file"
                                />
                            </Tooltip>
                        )}
                        {!showProvenancePrompt && (
                            <Tooltip content={PROVENANCE_DESCRIPTOR_TOOLTIP}>
                                <LinkLikeButton
                                    className={styles.advancedOptionsButton}
                                    onClick={() => setShowProvenancePrompt(true)}
                                    text="Provenance descriptor file"
                                />
                            </Tooltip>
                        )}
                    </div>
                    {showMetadataPrompt && (
                        <DescriptorFilePrompt
                            fileLabel="Column descriptor file"
                            isModal={props.isModal}
                            kind="metadata"
                            onClose={() => setShowMetadataPrompt(false)}
                            onSelectFile={setMetadataSource}
                            selectedFile={metadataSource}
                        />
                    )}
                    {showProvenancePrompt && (
                        <DescriptorFilePrompt
                            fileLabel="Provenance descriptor file"
                            isModal={props.isModal}
                            kind="provenance"
                            onClose={() => setShowProvenancePrompt(false)}
                            onSelectFile={setProvenanceSource}
                            selectedFile={provenanceSource}
                        />
                    )}
                </>
            )}
        </DataSourcePromptTemplate>
    );
}

interface DescriptorFilePromptProps {
    fileLabel: string;
    isModal?: boolean;
    kind: "metadata" | "provenance";
    onClose: () => void;
    onSelectFile: (file?: Source) => void;
    selectedFile?: Source;
}

function DescriptorFilePrompt(props: DescriptorFilePromptProps) {
    const { fileLabel, kind, onClose, onSelectFile, selectedFile } = props;
    return (
        <div
            className={classNames(
                styles.fullWidth,
                selectedFile ? styles.advancedOptionsFilled : styles.advancedOptionsEmpty
            )}
        >
            {!selectedFile && (
                <div className={styles.advancedOptionsHeader}>
                    <h4 className={styles.fullWidth}>{fileLabel}</h4>
                    <TransparentIconButton
                        className={styles.iconButton}
                        iconName="Cancel"
                        onClick={() => {
                            onSelectFile(undefined);
                            onClose();
                        }}
                    />
                </div>
            )}
            <div className={styles.filePromptWrapper}>
                <FilePrompt
                    className={classNames(styles.filePrompt, styles.filePromptWide)}
                    onSelectFile={onSelectFile}
                    selectedFile={selectedFile}
                    parentId={`file-prompt-${kind}-${props.isModal ? "modal" : "main"}`}
                    fileLabel={`${fileLabel}: `}
                    lightBackground={props.isModal}
                />
            </div>
        </div>
    );
}
