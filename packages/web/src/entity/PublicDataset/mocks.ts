import PublicDataset from ".";

export function makePublicDatasetMock(id: string): PublicDataset {
    const datasetDetail = {
        annotations: [],
        dataset_id: id,
        dataset_name: `${id} Interphase and prophase shape-matched cells`,
        dataset_path: "/fake/path/to/dataset.csv",
        dataset_size: "10000",
        description: `This is a longer description of this dataset to help users 
            understand what this dataset is. We may need a “read more” affordance here 
            and then another way to go to a full readme type description page. ID: ${id}`,
        file_count: "200000",
        created: "Jan-02-2023",
        published: "Jan-04-2023",
        related_publication:
            "Integrated intracellular organization and its variations in human iPS cells",
        doi: "https://doi.org/10.1038/s41586-022-05563-7",
        version: "1",
    };
    return new PublicDataset(datasetDetail);
}
