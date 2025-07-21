import * as React from "react";
import { useSelector } from "react-redux";

import FileSet from "../../../../core/entity/FileSet";
import { interaction } from "../../../../core/state";
import FileSort from "../../../../core/entity/FileSort";
import PublicDataset, { PublicDatasetProps } from "../../entity/PublicDataset";

/**
 * Custom React hook to accomplish storing and fetching details of datasets (i.e., dataset metadata).
 * This hook exposes loading state: if a network request is in flight for dataset details the second element
 * of the return array will be true.
 */
export default function useDatasetDetails(
    fileSort?: FileSort | undefined
): [PublicDatasetProps[] | null, boolean, string | undefined] {
    const [isLoading, setIsLoading] = React.useState(false);
    const [error, setError] = React.useState<string>();
    const [items, setItems] = React.useState<PublicDatasetProps[]>([]);
    const publicDatasetListService = useSelector(
        interaction.selectors.getPublicDatasetManifestService
    );

    const fileSet = React.useMemo(() => {
        if (!publicDatasetListService) return;
        return new FileSet({
            fileService: publicDatasetListService,
            sort: fileSort,
        });
    }, [publicDatasetListService, fileSort]);
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
                    setItems(
                        itemList.map(
                            (dataset) =>
                                new PublicDataset(
                                    { dataset_name: dataset.name },
                                    dataset.annotations
                                ).details
                        )
                    );
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
