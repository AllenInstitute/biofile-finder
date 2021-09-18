import {
    ContextualMenuItemType,
    DefaultButton,
    Icon,
    IContextualMenuItem,
    TooltipHost,
} from "@fluentui/react";
import { orderBy } from "lodash";
import * as React from "react";
import { useDispatch, useSelector } from "react-redux";

import { Dataset } from "../../services/DatasetService";
import { metadata, selection } from "../../state";
import { setFileSetSource } from "../../state/selection/actions";

const styles = require("./FileSetSourceSelector.module.css");

interface Props {
    className?: string;
}

const FILE_SET_SOURCE_INFO_TOOLTIP =
    "Select which file source you would like to query from. A file source can either be a set of files with fixed immutable metadata, a set of files with mutable 'live' metadata, or all of FMS which is the default option.";

const ALL_FILES_KEY = "All of FMS";

const FROZEN_DATASET_HEADER: IContextualMenuItem = {
    key: "Fixed Datasets",
    text: "Fixed Datasets",
    title: "Fixed Datasets have files with immutable metadata, meaning they may not be up to date",
    itemType: ContextualMenuItemType.Header,
    itemProps: {
        styles: {
            label: {
                // Color pulled from App.module.css "primary-brand-purple"
                color: "#827aa3",
            },
        },
    },
};

const LIVE_DATASET_HEADER: IContextualMenuItem = {
    key: "Live File Sets",
    text: "Live File Sets",
    title: "Live File Sets act as a filter to narrow the files in FMS down to a specific set",
    itemType: ContextualMenuItemType.Header,
    itemProps: {
        styles: {
            label: {
                // Color pulled from App.module.css "primary-brand-purple"
                color: "#827aa3",
            },
        },
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

    const dataSourceOptions = React.useMemo(() => {
        // Make "All Files" a data source option to represent
        // having no data source filter
        const ALL_FILES_OPTION: IContextualMenuItem = {
            text: ALL_FILES_KEY,
            key: ALL_FILES_KEY,
            onClick: () => {
                dispatch(setFileSetSource(undefined));
            },
        };

        const nameToDatasetMap = datasets.reduce(
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
                              })),
                          }
                        : undefined,
                onClick: () => {
                    dispatch(setFileSetSource(datasetsWithSameName[0].id));
                },
            };
            if (datasetsWithSameName[0].isFixed) {
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
    }, [datasets, dispatch]);

    return (
        <div className={props.className}>
            <div className={styles.title}>
                <h3>File Set Source</h3>
                <TooltipHost content={FILE_SET_SOURCE_INFO_TOOLTIP}>
                    <Icon className={styles.infoIcon} iconName="InfoSolid" />
                </TooltipHost>
            </div>
            <DefaultButton
                className={styles.dropdown}
                text={selectedDataset}
                menuProps={{ items: dataSourceOptions }}
                styles={{
                    root: {
                        padding: 0,
                        paddingLeft: 4,
                        paddingRight: 4,
                    },
                    textContainer: {
                        overflowY: "hidden",
                    },
                    label: {
                        fontWeight: 100,
                        overflowY: "hidden",
                        textAlign: "left",
                        textOverflow: "ellipsis",
                        whiteSpace: "no-wrap",
                    },
                }}
            />
        </div>
    );
}
