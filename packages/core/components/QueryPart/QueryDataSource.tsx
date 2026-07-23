import { ContextualMenuItemType } from "@fluentui/react";
import * as React from "react";
import { useDispatch, useSelector } from "react-redux";

import QueryPart from ".";
import { AICS_FMS_DATA_SOURCE_NAME } from "../../constants";
import { getNameAndTypeFromSourceUrl, Source } from "../../entity/SearchParams";
import { interaction, metadata, selection } from "../../state";

interface Props {
    dataSources: Source[];
    sourceMetadata?: Source;
    sourceProvenance?: Source;
}

/**
 * Component responsible for rendering the "Data Source" part of the query
 */
export default function QueryDataSource(props: Props) {
    const dispatch = useDispatch();
    const selectedQuery = useSelector(selection.selectors.getSelectedQuery);
    const dataSources = useSelector(metadata.selectors.getDataSources);
    const selectedDataSources = useSelector(selection.selectors.getSelectedDataSources);
    const markdownUrls = useSelector(selection.selectors.getDatasetUrlsFromMarkdown);
    const datasetDescriptionSource = useSelector(selection.selectors.getDatasetDescriptionSource);
    const { mainSources, columnDescriptionSource, provenanceSource } = React.useMemo(() => {
        if (markdownUrls) {
            const main_url = markdownUrls?.dataset_url;
            const descriptions_url = markdownUrls?.descriptions_url;
            const provenance_url = markdownUrls?.provenance_url;
            return {
                mainSources: main_url
                    ? [{ ...getNameAndTypeFromSourceUrl(main_url), uri: main_url }]
                    : props.dataSources,
                columnDescriptionSource: descriptions_url
                    ? { ...getNameAndTypeFromSourceUrl(descriptions_url), uri: descriptions_url }
                    : props.sourceMetadata,
                provenanceSource: provenance_url
                    ? { ...getNameAndTypeFromSourceUrl(provenance_url), uri: provenance_url }
                    : props.sourceProvenance,
            };
        } else {
            return {
                mainSources: props.dataSources,
                columnDescriptionSource: props.sourceMetadata,
                provenanceSource: props.sourceProvenance,
            };
        }
    }, [markdownUrls, props.dataSources, props.sourceMetadata, props.sourceProvenance]);

    const onShowDatasetInfo = () => {
        if (!datasetDescriptionSource) return undefined;
        else {
            // TO DO: dispatch action when we have the UI component
        }
    };

    return (
        <QueryPart
            title="Data source"
            disabled={selectedDataSources[0]?.name === AICS_FMS_DATA_SOURCE_NAME}
            onDelete={
                selectedDataSources.length > 1
                    ? (dataSource) =>
                          dispatch(
                              selection.actions.changeDataSources(
                                  selectedDataSources.filter((s) => s.name !== dataSource)
                              )
                          )
                    : undefined
            }
            onShowDatasetInfo={datasetDescriptionSource ? onShowDatasetInfo : undefined}
            addMenuListItems={[
                {
                    key: "ADD DATA SOURCE",
                    text: "ADD DATA SOURCE",
                    itemType: ContextualMenuItemType.Header,
                },
                ...dataSources
                    .filter(
                        (source) =>
                            !selectedDataSources.some((s) => s.name === source.name) &&
                            source.name !== AICS_FMS_DATA_SOURCE_NAME
                    )
                    .map((source) => ({
                        key: source.id,
                        text: source.name,
                        iconProps: { iconName: "Folder" },
                        onClick: () => {
                            if (selectedDataSources.length) {
                                dispatch(
                                    selection.actions.changeDataSources([
                                        ...selectedDataSources,
                                        source,
                                    ])
                                );
                            } else {
                                dispatch(
                                    selection.actions.addQuery({
                                        name: `New ${source.name} query`,
                                        parts: { sources: [source] },
                                    })
                                );
                            }
                        },
                    })),
                {
                    key: "New Data Source",
                    text: "New data source",
                    iconProps: { iconName: "NewFolder" },
                    onClick: () => {
                        dispatch(
                            interaction.actions.promptForDataSource({
                                query: selectedQuery,
                                source: selectedDataSources[0],
                            })
                        );
                    },
                },
            ]}
            rows={[
                ...mainSources.map((dataSource) => ({
                    id: dataSource.name,
                    title: dataSource.name,
                    datasetDescriptionSource: datasetDescriptionSource?.name,
                })),
                ...(columnDescriptionSource
                    ? [
                          {
                              id: "sourceMetadata",
                              title: `described by: ${columnDescriptionSource.name}`,
                          },
                      ]
                    : []),
                ...(provenanceSource
                    ? [
                          {
                              id: "sourceProvenance",
                              title: `provenance from: ${provenanceSource.name}`,
                          },
                      ]
                    : []),
            ]}
        />
    );
}
