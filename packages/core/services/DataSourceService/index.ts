import { uniqBy } from "lodash";

import DatabaseService from "../DatabaseService";
import DatabaseServiceNoop from "../DatabaseService/DatabaseServiceNoop";
import { Source } from "../../entity/FileExplorerURL";
import SQLBuilder from "../../entity/SQLBuilder";

export interface DataSource extends Source {
    id: string;
    version: string;
    doi?: string;
    size: string;
    count: string;
    creationDate: string;
    publicationDate?: string;
    publication?: string;
    description: string;
    source: string;
}

/**
 * Service responsible for fetching dataset related metadata.
 */
export default class DataSourceService {
    public static readonly DATASET_MANIFEST_NAME = "Dataset Manifest";

    private readonly databaseService: DatabaseService;
    private readonly manifestUrl: string;
    private publicDataSources: DataSource[] | undefined;

    constructor(
        databaseService: DatabaseService = new DatabaseServiceNoop(),
        manifestEnv: "production" | "staging"
    ) {
        this.databaseService = databaseService;
        this.manifestUrl =
            manifestEnv === "production"
                ? "https://biofile-finder-datasets.s3.us-west-2.amazonaws.com/Dataset+Manifest.csv"
                : "https://staging-biofile-finder-datasets.s3.us-west-2.amazonaws.com/Dataset+Manifest.csv";
    }

    /**
     * Requests for all available data sources.
     */
    public async getAll(): Promise<Source[]> {
        const publicDataSources = await this.getPublicDataSources();
        const preparedDataSources = this.databaseService.getDataSources();
        return uniqBy([...publicDataSources, ...preparedDataSources], "name");
    }

    /**
     * Requests for all public data sources.
     */
    private async getPublicDataSources(): Promise<DataSource[]> {
        if (!this.publicDataSources) {
            await this.databaseService.prepareDataSources([
                {
                    name: DataSourceService.DATASET_MANIFEST_NAME,
                    type: "csv",
                    uri: this.manifestUrl,
                },
            ]);

            const sql = new SQLBuilder().from(DataSourceService.DATASET_MANIFEST_NAME).toSQL();

            const rows = await this.databaseService.query(sql);
            this.publicDataSources = rows.map((row) => ({
                type: "csv",
                id: row["Dataset name"] + row["Version"],
                name: row["Dataset name"],
                version: row["Version"],
                uri: row["File Path"],
                doi: row["DOI"],
                size: row["Size"],
                source: row["Source"],
                count: row["File count"],
                creationDate: row["Creation date"],
                description: row["Short description"],
                publication: row["Related publication"],
                publicationDate: row["Publication date"],
            }));
        }

        return this.publicDataSources;
    }
}
