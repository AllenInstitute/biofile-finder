import * as React from "react";
import { useSelector } from "react-redux";

import { DatasetDetail } from ".";
import { processMarkdown } from "../../entity/MarkdownFrontMatter";
import { selection } from "../../state";

/**
 * Custom React hook to fetch metadata for a dataset
 */
export default function useDatasetMetadata(): [
    DatasetDetail[] | undefined,
    string | undefined,
    string | undefined,
    boolean
] {
    const datasetDescriptionSource = useSelector(selection.selectors.getDatasetDescriptionSource);

    const [datasetDetails, setDatasetDetails] = React.useState<DatasetDetail[] | undefined>();
    const [title, setTitle] = React.useState<string>();
    const [description, setDescription] = React.useState<string>();
    const [isLoading, setIsLoading] = React.useState(false);

    React.useEffect(() => {
        let ignoreResponse = false;
        if (!datasetDescriptionSource) {
            // nothing to fetch
            return setDatasetDetails(undefined);
        }
        setIsLoading(true);
        processMarkdown(datasetDescriptionSource, false)
            .then((details) => {
                if (!ignoreResponse) {
                    const detailsAsArray = Object.entries(details.metadata ?? [])
                        .filter(([key]) => {
                            return key !== "title"; // title is passed separately
                        })
                        .map(([key, value]) => {
                            return {
                                label: key,
                                value: value?.toString() || "--",
                            };
                        });
                    setDatasetDetails(detailsAsArray);
                    setTitle(details.metadata?.title ?? "Dataset information");
                    setDescription(details.body);
                }
            })
            .catch(console.error)
            .finally(() => {
                if (!ignoreResponse) {
                    setIsLoading(false);
                }
            });

        return function cleanup() {
            ignoreResponse = true;
        };
    }, [datasetDescriptionSource]);

    return [datasetDetails, title, description, isLoading];
}
