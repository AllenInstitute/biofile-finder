import { ContextualMenuItemType } from "@fluentui/react";
import * as React from "react";
import { useDispatch, useSelector } from "react-redux";

import QueryPart from ".";
import { AICS_FMS_DATA_SOURCE_NAME } from "../../constants";
import { Source } from "../../entity/FileExplorerURL";
import { interaction, metadata, selection } from "../../state";

interface Props {
    dataSources: Source[];
}

/**
 * Component responsible for rendering the "Data Source" part of the query
 */
export default function QueryDataSource(props: Props) {
    const dispatch = useDispatch();
    const selectedQuery = useSelector(selection.selectors.getSelectedQuery);
    const dataSources = useSelector(metadata.selectors.getDataSources);
    const selectedDataSources = useSelector(selection.selectors.getSelectedDataSources);

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
                        dispatch(interaction.actions.promptForDataSource({ query: selectedQuery }));
                    },
                },
            ]}
            rows={props.dataSources.map((dataSource) => ({
                id: dataSource.name,
                title: dataSource.name,
            }))}
        />
    );
}
