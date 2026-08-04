import { ContextualMenuItemType } from "@fluentui/react";
import * as React from "react";
import { useDispatch, useSelector } from "react-redux";

import QueryPart from ".";
import { AICS_FMS_DATA_SOURCE_NAME } from "../../constants";
import { isMarkdownType, Source } from "../../entity/SearchParams";
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
    const markdownSources = useSelector(selection.selectors.getDatasetSourcesFromMarkdown);
    const datasetDescriptionSource = useSelector(selection.selectors.getDatasetDescriptionSource);
    const { mainSources, columnDescriptionSource, provenanceSource } = React.useMemo(() => {
        if (markdownSources) {
            const mainSource = markdownSources?.dataSource;
            const descriptionsSource = markdownSources?.descriptionsSource;
            const provenanceSource = markdownSources?.provenanceSource;
            return {
                mainSources: mainSource
                    ? // avoid displaying the main source twice, and don't include any markdown files
                      [
                          ...props.dataSources.filter(
                              (source) =>
                                  source.name !== mainSource?.name && !isMarkdownType(source.type)
                          ),
                          mainSource,
                      ]
                    : props.dataSources,
                // Prioritize manually provided sources over ones parsed from markdown
                columnDescriptionSource: props.sourceMetadata || descriptionsSource,
                provenanceSource: props.sourceProvenance || provenanceSource,
            };
        } else {
            return {
                mainSources: props.dataSources,
                columnDescriptionSource: props.sourceMetadata,
                provenanceSource: props.sourceProvenance,
            };
        }
    }, [markdownSources, props.dataSources, props.sourceMetadata, props.sourceProvenance]);

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
