import { IColumn } from "@fluentui/react";
import { DatasetAnnotations } from "../../entity/PublicDataset";

// TO DO: Use better pattern to avoid so many constants
export const columns: IColumn[] = [
    {
        key: "column1",
        name: DatasetAnnotations.DATASET_NAME.displayLabel.toUpperCase(),
        fieldName: DatasetAnnotations.DATASET_NAME.name,
        ariaLabel: "Column operations for File type, Press to sort on File type",
        isResizable: true,
        minWidth: 110,
        maxWidth: 200,
    },
    {
        key: "column2",
        name: DatasetAnnotations.CREATION_DATE.displayLabel.toUpperCase(),
        fieldName: DatasetAnnotations.CREATION_DATE.name,
        minWidth: 112,
        maxWidth: 132,
        isResizable: true,
    },
    {
        key: "column3",
        name: DatasetAnnotations.RELATED_PUBLICATON.displayLabel.toUpperCase(),
        fieldName: DatasetAnnotations.RELATED_PUBLICATON.name,
        // onColumnClick: this._onColumnClick,
        minWidth: 168,
        maxWidth: 198,
        isResizable: true,
    },
    {
        key: "column4",
        name: DatasetAnnotations.PUBLICATION_DATE.displayLabel.toUpperCase(),
        fieldName: DatasetAnnotations.PUBLICATION_DATE.name,
        minWidth: 128,
        maxWidth: 148,
        isResizable: true,
    },
    {
        key: "column5",
        name: DatasetAnnotations.FILE_COUNT.displayLabel.toUpperCase(),
        fieldName: DatasetAnnotations.FILE_COUNT.name,
        minWidth: 89,
        maxWidth: 109,
        isResizable: true,
        data: "number",
    },
    {
        key: "column6",
        name: DatasetAnnotations.DATASET_SIZE.displayLabel.toUpperCase(),
        fieldName: DatasetAnnotations.DATASET_SIZE.name,
        minWidth: 78,
        maxWidth: 98,
        isResizable: true,
    },
    {
        key: "column7",
        name: DatasetAnnotations.DATASET_DESCRIPTION.displayLabel.toUpperCase(),
        fieldName: DatasetAnnotations.DATASET_DESCRIPTION.name,
        minWidth: 118,
        maxWidth: 224,
        isResizable: true,
    },
];
