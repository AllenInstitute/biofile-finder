import {
    ContextualMenu,
    ContextualMenuItemType,
    Icon,
    IconButton,
    IContextualMenuItem,
    SearchBox,
    TooltipHost,
} from "@fluentui/react";
import { orderBy } from "lodash";
import * as React from "react";
import { useDispatch, useSelector } from "react-redux";

import { Dataset } from "../../services/DatasetService";
import { interaction, metadata, selection } from "../../state";
import { setFileSetSource } from "../../state/selection/actions";
import { MENU_HEADER_STYLES } from "../ContextMenu/items";

const styles = require("./FileSetSourceSelector.module.css");

interface Props {
    className?: string;
}

const FILE_SET_SOURCE_INFO_TOOLTIP =
    "Select which file source you would like to query from. A file source can either be a set of files with fixed immutable metadata, a set of files with mutable 'live' metadata, or all of FMS which is the default option.";

const ALL_FILES_KEY = "All of FMS";

const SELECTED_STYLES: Partial<IContextualMenuItem> = {
    itemProps: {
        styles: {
            root: {
                // Color derived from background of selected dropdown item
                backgroundColor: "#EFEFEF"
            }
        }
    }
}

const FROZEN_DATASET_HEADER: IContextualMenuItem = {
    key: "Fixed Datasets",
    text: "Fixed Datasets",
    title: "Fixed Datasets have files with immutable metadata, meaning they may not be up to date",
    itemType: ContextualMenuItemType.Header,
    itemProps: {
        styles: MENU_HEADER_STYLES
    },
};

const LIVE_DATASET_HEADER: IContextualMenuItem = {
    key: "Live File Sets",
    text: "Live File Sets",
    title: "Live File Sets act as a filter to narrow the files in FMS down to a specific set",
    itemType: ContextualMenuItemType.Header,
    itemProps: {
        styles: MENU_HEADER_STYLES
    },
};

/**
 * Component responsible for rendering a selector capable of changing the
 * set of files all queries will be used against.
 */
export default function FileSetSourceSelector(props: Props) {
    const dispatch = useDispatch();
    const datasets = useSelector(metadata.selectors.getActiveDatasets);
    const datasetId = useSelector(selection.selectors.getFileSetSourceId);
    const selectedDataset =
        datasets.find((dataset) => dataset.id === datasetId)?.name || ALL_FILES_KEY;

    const searchBoxReference = React.useRef(null);
    const [searchValue, setSearchValue] = React.useState("");
    const [showDropdown, setShowDropdown] = React.useState(false);

    const dataSourceOptions = React.useMemo(() => {
        // Make "All Files" a data source option to represent
        // having no data source filter
        const ALL_FILES_OPTION: IContextualMenuItem = {
            text: ALL_FILES_KEY,
            key: ALL_FILES_KEY,
            onClick: () => {
                dispatch(setFileSetSource(undefined));
            },
            ...(!datasetId && SELECTED_STYLES)
        };

        const nameToDatasetMap = datasets.filter(dataset => dataset.name.toLowerCase().includes(searchValue)).reduce(
            (accum, dataset) => ({
                ...accum,
                [dataset.name]: orderBy(
                    [...(accum[dataset.name] || []), dataset],
                    "version",
                    "desc"
                ),
            }),
            {} as { [name: string]: Dataset[] }
        );

        const frozenDatasets: IContextualMenuItem[] = [];
        const liveDatasets: IContextualMenuItem[] = [];
        Object.values(nameToDatasetMap).forEach((datasetsWithSameName) => {
            const option = {
                key: datasetsWithSameName[0].id,
                text: datasetsWithSameName[0].name,
                title: `Created ${new Date(datasetsWithSameName[0].created).toLocaleString()} by ${
                    datasetsWithSameName[0].createdBy
                }`,
                subMenuProps:
                    datasetsWithSameName.length > 1
                        ? {
                                items: datasetsWithSameName.map((dataset, index) => ({
                                    key: dataset.id,
                                    text:
                                        index === 0
                                            ? `${dataset.name} (Default - V${dataset.version})`
                                            : `${dataset.name} (V${dataset.version})`,
                                    title: `Created ${new Date(
                                        dataset.created
                                    ).toLocaleString()} by ${dataset.createdBy}`,
                                    onClick: () => {
                                        dispatch(setFileSetSource(dataset.id));
                                    },
                                    ...(dataset.id === datasetId && SELECTED_STYLES)
                                })),
                            }
                        : undefined,
                onClick: () => {
                    dispatch(setFileSetSource(datasetsWithSameName[0].id));
                },
                ...(datasetsWithSameName[0].id === datasetId && SELECTED_STYLES)
            };
            if (datasetsWithSameName[0].fixed) {
                frozenDatasets.push(option);
            } else {
                liveDatasets.push(option);
            }
        });

        return [
            ALL_FILES_OPTION,
            ...(liveDatasets.length ? [LIVE_DATASET_HEADER] : []),
            ...liveDatasets,
            ...(frozenDatasets.length ? [FROZEN_DATASET_HEADER] : []),
            ...frozenDatasets,
        ];
    }, [datasets, datasetId, searchValue, dispatch]);

    function onMenuDismiss() {
        setSearchValue("");
        setShowDropdown(false);
    }

    return (
        <div className={props.className}>
            <div className={styles.title}>
                <h3>File Set Source</h3>
                <TooltipHost content={FILE_SET_SOURCE_INFO_TOOLTIP}>
                    <Icon className={styles.infoIcon} iconName="InfoSolid" />
                </TooltipHost>
            </div>
            <div className={styles.dropdownRow}>
                <input
                    required
                    className={styles.dropdownInput}
                    spellCheck={false}
                    onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
                        setSearchValue(event.target.value.toLowerCase());
                    }}
                    ref={searchBoxReference}
                    placeholder="Search..."
                    onClick={() => setShowDropdown(true)}
                    value={showDropdown ? searchValue : selectedDataset}
                    type="search"
                />
                {datasetId && (
                    <IconButton 
                        className={styles.shareButton}
                        iconProps={{ iconName: "share" }}
                        menuProps={{ items: [
                            {
                                key: "Create Python Snippet",
                                text: "Create Python Snippet",
                                onClick: () => {
                                    const dataset = datasets.find(dataset => dataset.id === datasetId);
                                    if (dataset) {
                                        dispatch(interaction.actions.generatePythonSnippet(dataset))
                                    }
                                }
                            }
                        ] }}
                    />
                )}
            </div>
            <ContextualMenu
                items={dataSourceOptions}
                hidden={!showDropdown}
                target={searchBoxReference.current}
                onDismiss={onMenuDismiss}
                onItemClick={onMenuDismiss}
            />
        </div>
    );
}
