import AddDataSource from "./AddDataSource.png";
import GroupedDataSources from "./GroupedDataSources.png";
import LoadSource from "./LoadSource.png";
import NewDataSourceColumns from "./NewDataSourceColumns.png";
import SaveMetadataAs from "./SaveMetadataAs.png";
import { Feature } from "../Feature";

export default {
    id: 2,
    text: "Create or combine data sources",
    slides: [
        {
            imgSrc: LoadSource,
            caption:
                "Data can be loaded from a CSV, Parquet, or JSON file. The data source must include a column that contains the file path to the data. The data source can be loaded from a URL or uploaded from your computer.",
        },
        {
            imgSrc: AddDataSource,
            caption: "Additional data sources can be added the same way as the first.",
        },
        {
            imgSrc: GroupedDataSources,
            caption:
                'After you have added data, you can filter, group, and sort it. This screenshot shows an example of grouping by an automatically generated column, "Data source," which represents the source of each file.',
        },
        {
            imgSrc: SaveMetadataAs,
            caption:
                'New data sources can be generated from any number of existing data sources (filtered or whole). Right-click your file selection, select "Save metadata as", and choose your preferred file format.',
        },
        {
            imgSrc: NewDataSourceColumns,
            caption:
                "You will be prompted for the columns you would like to include in the resulting new data source.",
        },
    ],
} as Feature;
