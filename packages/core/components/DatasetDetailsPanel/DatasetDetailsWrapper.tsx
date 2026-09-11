import * as React from "react";

import DatasetDetailsPanel from ".";
import useDatasetMetadata from "./useDatasetMetadata";

export default function DatasetDetailsWrapper() {
    const [datasetDetails, title, description, isLoading] = useDatasetMetadata();
    return (
        <DatasetDetailsPanel
            datasetDetails={datasetDetails}
            title={title}
            description={description}
            isLoading={isLoading}
        />
    );
}
