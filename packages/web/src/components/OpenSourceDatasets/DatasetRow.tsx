import { IDetailsRowProps, IRenderFunction } from "@fluentui/react";
import classNames from "classnames";
import * as React from "react";
import { useDispatch } from "react-redux";

import PublicDataset from "../../entity/PublicDataset";
import { interaction } from "../../../../core/state";
import { PrimaryButton } from "../../../../core/components/Buttons";

import styles from "./DatasetRow.module.css";

interface DatasetRowProps {
    rowProps: IDetailsRowProps;
    defaultRender: IRenderFunction<IDetailsRowProps>;
    onLoadDataset: (dataset: PublicDataset) => void;
}

export default function DatasetRow(props: DatasetRowProps) {
    const dispatch = useDispatch();
    const [showActions, setShowActions] = React.useState(true);
    const dataset = new PublicDataset(props.rowProps.item);

    const selectDataset = () => {
        dispatch(interaction.actions.setSelectedPublicDataset(dataset));
        dispatch(interaction.actions.showDatasetDetailsPanel());
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
                    onClick={() => props.onLoadDataset(dataset)}
                />
            </div>
        </div>
    );
}
