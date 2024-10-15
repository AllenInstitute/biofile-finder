import { IDetailsRowProps, IRenderFunction } from "@fluentui/react";
import classNames from "classnames";
import * as React from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";

import PublicDataset from "../../entity/PublicDataset";
import { interaction, selection } from "../../../../core/state";
import { getNameAndTypeFromSourceUrl, Source } from "../../../../core/entity/FileExplorerURL";
import { PrimaryButton } from "../../../../core/components/Buttons";

import styles from "./DatasetRow.module.css";

interface DatasetRowProps {
    rowProps: IDetailsRowProps;
    defaultRender: IRenderFunction<IDetailsRowProps>;
}

export default function DatasetRow(props: DatasetRowProps) {
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const [showActions, setShowActions] = React.useState(true);
    const dataset = new PublicDataset(props.rowProps.item);
    const currentGlobalURL = useSelector(selection.selectors.getEncodedFileExplorerUrl);

    const selectDataset = () => {
        dispatch(interaction.actions.setSelectedPublicDataset(dataset));
        dispatch(interaction.actions.showDatasetDetailsPanel());
    };

    const openDatasetInApp = (source: Source) => {
        dispatch(
            selection.actions.addQuery({
                name: `New ${source.name} Query on ${dataset?.name || "open-source dataset"}`,
                parts: { sources: [source] },
            })
        );
        navigate({
            pathname: "/app",
            search: `?${currentGlobalURL}`,
        });
    };

    const loadDataset = () => {
        const dataSourceURL = dataset?.path;
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
            onClick={() => selectDataset()}
        >
            {props.defaultRender({ ...props.rowProps })}
            <div
                className={classNames(styles.buttonWrapper, {
                    [styles.buttonWrapperHidden]: showActions,
                })}
            >
                <PrimaryButton className={styles.button} title="Dataset details" text="DETAILS" />
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
