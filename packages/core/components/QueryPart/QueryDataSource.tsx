import { List } from "@fluentui/react";
import * as React from "react";
import { useDispatch, useSelector } from "react-redux";

import QueryPart from ".";
import ListRow, { ListItem } from "../ListPicker/ListRow";
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

    const addDataSourceOptions: ListItem<Source>[] = [
        ...dataSources.map((source) => ({
            displayValue: source.name,
            value: source.name,
            disabled:
                selectedDataSources.length <= 1 &&
                selectedDataSources.some((selected) => source.name === selected.name),
            data: source,
            selected: selectedDataSources.some((selected) => source.name === selected.name),
        })),
        {
            displayValue: "New Data Source...",
            value: "New Data Source...",
            selected: false,
        },
    ];

    return (
        <QueryPart
            title="Data Source"
            addButtonIconName="Folder"
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
            onRenderAddMenuList={
                selectedDataSources[0]?.name === AICS_FMS_DATA_SOURCE_NAME
                    ? undefined
                    : () => (
                          <div data-is-scrollable="true">
                              <List
                                  ignoreScrollingState
                                  getKey={(item) => String(item.value)}
                                  items={addDataSourceOptions}
                                  onRenderCell={(item) =>
                                      item && (
                                          <ListRow
                                              item={item}
                                              onSelect={() =>
                                                  item.data
                                                      ? dispatch(
                                                            selection.actions.changeDataSources([
                                                                ...selectedDataSources,
                                                                item.data as Source,
                                                            ])
                                                        )
                                                      : dispatch(
                                                            interaction.actions.promptForDataSource(
                                                                {
                                                                    query: selectedQuery,
                                                                }
                                                            )
                                                        )
                                              }
                                              onDeselect={() =>
                                                  item.data &&
                                                  selectedDataSources.length > 1 &&
                                                  dispatch(
                                                      selection.actions.changeDataSources(
                                                          selectedDataSources.filter(
                                                              (source) =>
                                                                  source.name !== item.data?.name
                                                          )
                                                      )
                                                  )
                                              }
                                          />
                                      )
                                  }
                              />
                          </div>
                      )
            }
            rows={props.dataSources.map((dataSource) => ({
                id: dataSource.name,
                title: dataSource.name,
            }))}
        />
    );
}
