import { List } from "@fluentui/react";
import * as React from "react";
import { useDispatch, useSelector } from "react-redux";

import QueryPart from ".";
import { ModalType } from "../Modal";
import { Source } from "../../entity/FileExplorerURL";
import { interaction, metadata, selection } from "../../state";
import ListRow, { ListItem } from "../ListPicker/ListRow";

interface Props {
    dataSources: Source[];
}

/**
 * Component responsible for rendering the "Data Source" part of the query
 */
export default function QueryDataSource(props: Props) {
    const dispatch = useDispatch();
    const dataSources = useSelector(metadata.selectors.getDataSources);
    const selectedDataSources = useSelector(selection.selectors.getSelectedDataSources);

    const addDataSourceOptions: ListItem<Source>[] = React.useMemo(
        () => [
            ...dataSources.map((source) => ({
                displayValue: source.name,
                value: source.name,
                data: source,
                selected: selectedDataSources.some((selected) => source.name === selected.name),
                iconProps: { iconName: "Folder" },
                onClick: () => {
                    dispatch(selection.actions.addDataSource(source));
                },
                secondaryText: "Data Source",
            })),
            {
                displayValue: "New Data Source...",
                value: "New Data Source...",
                selected: false,
                iconProps: { iconName: "NewFolder" },
                onClick: () => {
                    dispatch(interaction.actions.setVisibleModal(ModalType.DataSource));
                },
            },
        ],
        [dispatch, dataSources, selectedDataSources]
    );

    return (
        <QueryPart
            title="Data Source"
            addButtonIconName="Folder"
            onDelete={(dataSource) => dispatch(selection.actions.removeDataSource(dataSource))}
            onRenderAddMenuList={() => (
                <div data-is-scrollable="true">
                    <List
                        ignoreScrollingState
                        getKey={(item) => String(item.value)}
                        items={addDataSourceOptions}
                        // onShouldVirtualize={() => filteredItems.length > 100}
                        onRenderCell={(item) =>
                            item && (
                                <ListRow
                                    item={item}
                                    // TODO: Need modal to add the data source to this current query after not just create a new one...
                                    onSelect={() =>
                                        item.data
                                            ? dispatch(
                                                  selection.actions.addDataSource(
                                                      item.data as Source
                                                  )
                                              )
                                            : dispatch(
                                                  interaction.actions.setVisibleModal(
                                                      ModalType.DataSource
                                                  )
                                              )
                                    }
                                    onDeselect={() =>
                                        item.data &&
                                        dispatch(selection.actions.removeDataSource(item.data.name))
                                    }
                                />
                            )
                        }
                    />
                </div>
            )}
            rows={props.dataSources.map((dataSource) => ({
                id: dataSource.name,
                title: dataSource.name,
            }))}
        />
    );
}
