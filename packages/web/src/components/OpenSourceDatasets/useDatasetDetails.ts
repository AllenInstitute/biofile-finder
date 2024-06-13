import * as React from "react";
import { useSelector } from "react-redux";

import PublicDataset from "../../entity/PublicDataset";
import FileSet from "../../../../core/entity/FileSet";
import { interaction } from "../../../../core/state";
import FileFilter from "../../../../core/entity/FileFilter";

/**
 * Custom React hook to accomplish storing and fetching details of datasets (i.e., dataset metadata).
 * This hook exposes loading state: if a network request is in flight for dataset details the second element
 * of the return array will be true.
 */
export default function useDatasetDetails(
    filters: FileFilter[]
): [PublicDataset[] | null, boolean, string | undefined] {
    const [isLoading, setIsLoading] = React.useState(false);
    const [error, setError] = React.useState<string>();
    const [items, setItems] = React.useState<PublicDataset[]>([]);
    const publicDatasetListService = useSelector(
        interaction.selectors.getPublicDatasetManifestService
    );

    const fileSet = React.useMemo(() => {
        if (!publicDatasetListService) return;
        return new FileSet({
            fileService: publicDatasetListService,
            filters,
            sort: undefined,
        });
    }, [publicDatasetListService, filters]);
    React.useEffect(() => {
        setIsLoading(true);
        if (!!publicDatasetListService && !!fileSet) {
            publicDatasetListService
                .getFiles({
                    from: 0,
                    limit: 100, // Chosen arbitrarily until we have enough datasets to require pagination
                    fileSet: fileSet,
                })
                .then((itemList) => {
                    const datasetMap = itemList.map(
                        (dataset) =>
                            new PublicDataset({ dataset_name: dataset.name }, dataset.annotations)
                    );
                    setItems(datasetMap);
                    setIsLoading(false);
                })
                .catch((error) => {
                    setError(error?.message);
                    setIsLoading(false);
                });
        }
        return () => {
            setIsLoading(false);
        };
    }, [fileSet, publicDatasetListService]);
    return [items, isLoading, error];
}
