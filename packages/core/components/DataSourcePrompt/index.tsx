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
    const prevShown = React.useRef({ metadata: false, provenance: false });

    // Closing a descriptor prompt removes the focused control, so hand focus back to the
    // button that opened it
    React.useEffect(() => {
        const prev = prevShown.current;
        if (prev.metadata && !showMetadataPrompt) {
            document.getElementById("add-metadata-descriptor-button")?.focus();
        } else if (prev.provenance && !showProvenancePrompt) {
            document.getElementById("add-provenance-descriptor-button")?.focus();
        }
        prevShown.current = { metadata: showMetadataPrompt, provenance: showProvenancePrompt };
    }, [showMetadataPrompt, showProvenancePrompt]);

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

    const descriptorPrompts = [
        {
            fileLabel: "Column descriptor file",
            kind: "metadata" as const,
            onClose: () => setShowMetadataPrompt(false),
            onSelectFile: setMetadataSource,
            selectedFile: metadataSource,
            show: showMetadataPrompt,
        },
        {
            fileLabel: "Provenance descriptor file",
            kind: "provenance" as const,
            onClose: () => setShowProvenancePrompt(false),
            onSelectFile: setProvenanceSource,
            selectedFile: provenanceSource,
            show: showProvenancePrompt,
        },
    ];

    const renderDescriptorPrompts = (hasSelectedFile: boolean) =>
        descriptorPrompts
            .filter((prompt) => prompt.show && !!prompt.selectedFile === hasSelectedFile)
            .map((prompt) => (
                <DescriptorFilePrompt
                    fileLabel={prompt.fileLabel}
                    isModal={props.isModal}
                    key={prompt.kind}
                    kind={prompt.kind}
                    onClose={prompt.onClose}
                    onSelectFile={prompt.onSelectFile}
                    selectedFile={prompt.selectedFile}
                />
            ));

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
                    {renderDescriptorPrompts(true)}
                    <div className={styles.advancedOptionsButtons}>
                        {!metadataSource && !provenanceSource && (
                            <p className={styles.advancedOptionsLabel}>
                                Describe columns with supplemental metadata (optional):
                            </p>
                        )}
                        {!showMetadataPrompt && (
                            <Tooltip content={COLUMN_DESCRIPTOR_TOOLTIP}>
                                <LinkLikeButton
                                    className={styles.advancedOptionsButton}
                                    id="add-metadata-descriptor-button"
                                    onClick={() => setShowMetadataPrompt(true)}
                                    text="Add a column descriptor file"
                                />
                            </Tooltip>
                        )}
                        {!showMetadataPrompt && !showProvenancePrompt && (
                            <span className={styles.advancedOptionsDivider} aria-hidden="true" />
                        )}
                        {!showProvenancePrompt && (
                            <Tooltip content={PROVENANCE_DESCRIPTOR_TOOLTIP}>
                                <LinkLikeButton
                                    className={styles.advancedOptionsButton}
                                    id="add-provenance-descriptor-button"
                                    onClick={() => setShowProvenancePrompt(true)}
                                    text="Add a provenance descriptor file"
                                />
                            </Tooltip>
                        )}
                    </div>
                    {renderDescriptorPrompts(false)}
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
    const titleRef = React.useRef<HTMLHeadingElement>(null);

    // Opening (or re-emptying) this prompt unmounts whatever had focus; start at the title
    // rather than the URL field so the field isn't active by default
    React.useEffect(() => {
        titleRef.current?.focus();
        // Only on mount; FilePrompt manages focus after that
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return (
        <div
            className={classNames(
                styles.fullWidth,
                selectedFile ? styles.advancedOptionsFilled : styles.advancedOptionsEmpty
            )}
        >
            {!selectedFile && (
                <div className={styles.advancedOptionsHeader}>
                    <h4 className={styles.fullWidth} ref={titleRef} tabIndex={-1}>
                        {fileLabel}
                    </h4>
                    <TransparentIconButton
                        className={styles.iconButton}
                        iconName="Cancel"
                        label={`Close ${fileLabel.toLowerCase()} prompt`}
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
