export interface DatasetRow {
    id: number;
    datasetName: string;
    description: string;
    fileCount: number;
    size: string;
    dateCreatedValue?: string;
    relatedPublication?: string;
    datePublishedValue?: string;
}

// interface Publication {
//   title: string;
//   url?: string;
// }

// Mock data for testing
export const datasetList: DatasetRow[] = [
    {
        id: 1,
        datasetName: "testDataset",
        description: "Short description of dataset, or we can use beginning of a long one",
        dateCreatedValue: "May-20-2024",
        relatedPublication:
            "Integrated intracellular organization and its variations in human iPS cells",
        // {
        //   title: 'Integrated intracellular organization and its variations in human iPS cells',
        //   url: 'https://www.nature.com/articles/s41586-022-05563-7'
        // },
        datePublishedValue: "May-20-2024",
        fileCount: 100000,
        size: "10.1 TB",
    },
    {
        id: 2,
        datasetName: "testDataset2",
        description: "Short description of dataset, or we can use beginning of a long one",
        dateCreatedValue: "May-21-2024",
        relatedPublication:
            "Integrated intracellular organization and its variations in human iPS cells",
        datePublishedValue: "May-21-2024",
        fileCount: 200000,
        size: "2.5 TB",
    },
    {
        id: 3,
        datasetName: "testDataset3",
        description: "Another short description of dataset, or we can use beginning of a long one",
        dateCreatedValue: "May-19-2024",
        relatedPublication:
            "Integrated intracellular organization and its variations in human iPS cells",
        datePublishedValue: "May-19-2024",
        fileCount: 200000,
        size: "2.5 GB",
    },
];
