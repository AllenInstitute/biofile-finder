import {
    Dropdown,
    DropdownMenuItemType,
    Icon,
    IDropdownOption,
    TooltipHost,
} from "@fluentui/react";
import * as React from "react";
import { useDispatch, useSelector } from "react-redux";

import { metadata, selection } from "../../state";

const styles = require("./DataSourceSelector.module.css");

interface Props {
    className?: string;
}

// Make "All Files" a data source option to represent
// having no data source filter
const ALL_FILES_OPTION: IDropdownOption = {
    text: "All of FMS",
    key: "All of FMS",
};

const FROZEN_DATASET_HEADER: IDropdownOption = {
    key: "Fixed Datasets",
    text: "Fixed Datasets",
    title: "Fixed Datasets have files with immutable metadata, meaning they may not be up to date",
    itemType: DropdownMenuItemType.Header,
};

const LIVE_DATASET_HEADER: IDropdownOption = {
    key: "Live File Sets",
    text: "Live File Sets",
    title: "Live File Sets act as a filter to narrow the files in FMS down to a specific set",
    itemType: DropdownMenuItemType.Header,
};

/**
 * TODO
 */
export default function DataSourceSelector(props: Props) {
    const dispatch = useDispatch();
    const datasets = useSelector(metadata.selectors.getActiveDatasets);
    const datasetId = useSelector(selection.selectors.getDatasetId);

    const dataSourceOptions = React.useMemo(() => {
        const frozenDatasets = datasets
            .filter((dataset) => dataset.isFrozen)
            .map((dataset) => ({
                key: dataset.id,
                text: dataset.name,
            }));
        const liveDatasets = datasets
            .filter((dataset) => !dataset.isFrozen)
            .map((dataset) => ({
                key: dataset.id,
                text: dataset.name,
            }));
        if (!frozenDatasets.length || !liveDatasets.length) {
            return [ALL_FILES_OPTION, ...frozenDatasets, ...liveDatasets];
        }
        return [
            ALL_FILES_OPTION,
            LIVE_DATASET_HEADER,
            ...liveDatasets,
            FROZEN_DATASET_HEADER,
            ...frozenDatasets,
        ];
    }, [datasets]);

    function onSelectDataSource(_: React.FormEvent, selectedOption?: IDropdownOption) {
        // TODO: Increment dataset view metric when selected
        const selectedDataset = datasets.find((dataset) => dataset.id === selectedOption?.key);
        dispatch(selection.actions.changeDataSource(selectedDataset));
    }

    return (
        <div className={props.className}>
            <div className={styles.title}>
                {/* File Source? Dataset? */}
                <h3>File Source</h3>
                <TooltipHost content="Select which file source you would like to query from. A file source can either be a set of files with fixed immutable metadata, a set of files with mutable 'live' metadata, or all of FMS which is the default option.">
                    <Icon className={styles.infoIcon} iconName="InfoSolid" />
                </TooltipHost>
            </div>
            <div className={styles.dropdown}>
                <Dropdown
                    className={styles.dropdownSelector}
                    options={dataSourceOptions}
                    selectedKey={datasetId || ALL_FILES_OPTION.key}
                    onChange={onSelectDataSource}
                    // styles={{ title: { border: "none", borderRight: "1px solid black" } }}
                />
            </div>
        </div>
    );
}
