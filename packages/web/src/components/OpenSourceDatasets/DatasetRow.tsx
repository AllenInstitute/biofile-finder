import { IDetailsRowProps, IRenderFunction } from "@fluentui/react";
import classNames from "classnames";
import * as React from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";

import { PrimaryButton } from "../../../../core/components/Buttons";
import { getNameAndTypeFromSourceUrl, Source } from "../../../../core/entity/FileExplorerURL";
import { DataSource } from "../../../../core/services/DataSourceService";
import { selection } from "../../../../core/state";

import styles from "./DatasetRow.module.css";

interface DatasetRowProps {
    rowProps: IDetailsRowProps;
    defaultRender: IRenderFunction<IDetailsRowProps>;
    onSelect: (dataset: DataSource) => void;
}

export default function DatasetRow(props: DatasetRowProps) {
    const dataset = props.rowProps.item as DataSource;

    const dispatch = useDispatch();
    const navigate = useNavigate();
    const [showActions, setShowActions] = React.useState(true);
    const currentGlobalURL = useSelector(selection.selectors.getEncodedFileExplorerUrl);

    const openDatasetInApp = (source: Source) => {
        dispatch(
            selection.actions.addQuery({
                name: `New ${source.name} Query on ${dataset.name}`,
                parts: { sources: [source] },
            })
        );
        navigate({
            pathname: "/app",
            search: `?${currentGlobalURL}`,
        });
    };

    const loadDataset = () => {
        const dataSourceURL = dataset.uri as string;
        if (!dataSourceURL) throw new Error("No path provided to dataset");
        const { name, extensionGuess } = getNameAndTypeFromSourceUrl(dataSourceURL);
        openDatasetInApp({
            name,
            type: extensionGuess as "csv" | "json" | "parquet",
            uri: dataSourceURL,
        });
    };

    return (
        <div
            className={styles.tableRow}
            onMouseEnter={() => {
                setShowActions(false);
            }}
            onMouseLeave={() => {
                setShowActions(true);
            }}
            onClick={() => props.onSelect(dataset)}
        >
            {props.defaultRender({ ...props.rowProps })}
            <div
                className={classNames(styles.buttonWrapper, {
                    [styles.buttonWrapperHidden]: showActions,
                })}
            >
                <PrimaryButton
                    className={styles.button}
                    iconName=""
                    title="Dataset details"
                    text="DETAILS"
                />
                <PrimaryButton
                    className={styles.button}
                    iconName="Upload"
                    title="Load dataset"
                    text="LOAD"
                    onClick={loadDataset}
                />
            </div>
        </div>
    );
}
