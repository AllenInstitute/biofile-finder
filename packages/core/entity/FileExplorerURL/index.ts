import AnnotationName from "../Annotation/AnnotationName";
import FileFilter from "../FileFilter";
import FileFolder from "../FileFolder";
import FileSort, { SortOrder } from "../FileSort";
import { AICS_FMS_DATA_SOURCE_NAME } from "../../constants";

export interface Source {
    name: string;
    type?: "csv" | "json" | "parquet";
    uri?: string | File;
}

// Components of the application state this captures
export interface FileExplorerURLComponents {
    hierarchy: string[];
    sources: Source[];
    sourceMetadata?: Source;
    filters: FileFilter[];
    openFolders: FileFolder[];
    sortColumn?: FileSort;
}

export const EMPTY_QUERY_COMPONENTS: FileExplorerURLComponents = {
    hierarchy: [],
    filters: [],
    openFolders: [],
    sources: [],
};

const BEGINNING_OF_TODAY = new Date();
BEGINNING_OF_TODAY.setHours(0, 0, 0, 0);
const END_OF_TODAY = new Date();
END_OF_TODAY.setHours(23, 59, 59);
const DATE_LAST_YEAR = new Date(BEGINNING_OF_TODAY);
DATE_LAST_YEAR.setMonth(BEGINNING_OF_TODAY.getMonth() - 12);
const DATE_LAST_6_MONTHS = new Date(BEGINNING_OF_TODAY);
DATE_LAST_6_MONTHS.setMonth(BEGINNING_OF_TODAY.getMonth() - 6);
const DATE_LAST_MONTH = new Date(BEGINNING_OF_TODAY);
DATE_LAST_MONTH.setMonth(BEGINNING_OF_TODAY.getMonth() - 1);
const DATE_LAST_WEEK = new Date(BEGINNING_OF_TODAY);
DATE_LAST_WEEK.setDate(BEGINNING_OF_TODAY.getDate() - 7);
export const PAST_YEAR_FILTER = new FileFilter(
    AnnotationName.UPLOADED,
    `RANGE(${DATE_LAST_YEAR.toISOString()},${END_OF_TODAY.toISOString()})`
);
export const DEFAULT_AICS_FMS_QUERY: FileExplorerURLComponents = {
    hierarchy: [],
    openFolders: [],
    sources: [{ name: AICS_FMS_DATA_SOURCE_NAME }],
    filters: [PAST_YEAR_FILTER],
    sortColumn: new FileSort(AnnotationName.UPLOADED, SortOrder.DESC),
};

export const getNameAndTypeFromSourceUrl = (dataSourceURL: string) => {
    const uriResource = dataSourceURL.substring(dataSourceURL.lastIndexOf("/") + 1).split("?")[0];
    const name = `${uriResource} (${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()})`;
    let extensionGuess = uriResource.split(".").pop();
    if (!(extensionGuess === "csv" || extensionGuess === "json" || extensionGuess === "parquet")) {
        console.warn("Assuming the source is csv since no extension was recognized");
        extensionGuess = "csv";
    }
    return { name, extensionGuess };
};

/**
 * This represents a system for encoding application state information in a way
 * that allows users to copy, share, and paste the result back into the app and have the
 * URL decoded & rehydrated back in.
 */
export default class FileExplorerURL {
    /**
     * Encode this FileExplorerURL into a format easily transferable between users
     * that can be decoded back into the data used to create this FileExplorerURL.
     * Ideally the format this is in would be independent of the format/inner-workings
     * of our application state. As in, the names / system we track data in can change
     * without breaking an existing FileExplorerURL.
     * */
    public static encode(urlComponents: Partial<FileExplorerURLComponents>): string {
        const params = new URLSearchParams();
        urlComponents.hierarchy?.forEach((annotation) => {
            params.append("group", annotation);
        });
        urlComponents.filters?.forEach((filter) => {
            params.append("filter", JSON.stringify(filter.toJSON()));
        });
        urlComponents.openFolders?.map((folder) => {
            params.append("openFolder", JSON.stringify(folder.fileFolder));
        });
        urlComponents.sources?.map((source) => {
            params.append(
                "source",
                JSON.stringify({
                    ...source,
                    uri:
                        typeof source.uri === "string" || source.uri instanceof String
                            ? source.uri
                            : undefined,
                })
            );
        });
        if (urlComponents.sourceMetadata) {
            params.append(
                "sourceMetadata",
                JSON.stringify({
                    ...urlComponents.sourceMetadata,
                    uri:
                        typeof urlComponents.sourceMetadata.uri === "string" ||
                        urlComponents.sourceMetadata.uri instanceof String
                            ? urlComponents.sourceMetadata.uri
                            : undefined,
                })
            );
        }
        if (urlComponents.sortColumn) {
            params.append("sort", JSON.stringify(urlComponents.sortColumn.toJSON()));
        }

        return params.toString();
    }

    /**
     * Decode a previously encoded FileExplorerURL into components that can be rehydrated into the
     * application state
     */
    public static decode(encodedURL: string): FileExplorerURLComponents {
        const params = new URLSearchParams(encodedURL.trim());

        const unparsedSourceMetadata = params.get("sourceMetadata");
        const unparsedOpenFolders = params.getAll("openFolder");
        const unparsedFilters = params.getAll("filter");
        const unparsedSources = params.getAll("source");
        const hierarchy = params.getAll("group");
        const unparsedSort = params.get("sort");
        const hierarchyDepth = hierarchy.length;

        const parsedSort = unparsedSort ? JSON.parse(unparsedSort) : undefined;
        if (
            parsedSort &&
            parsedSort?.order !== SortOrder.ASC &&
            parsedSort?.order !== SortOrder.DESC
        ) {
            throw new Error("Sort order must be ASC or DESC");
        }
        return {
            hierarchy,
            sortColumn: parsedSort
                ? new FileSort(parsedSort.annotationName, parsedSort.order || SortOrder.ASC)
                : undefined,
            filters: unparsedFilters
                .map((unparsedFilter) => JSON.parse(unparsedFilter))
                .map(
                    (parsedFilter) =>
                        new FileFilter(parsedFilter.name, parsedFilter.value, parsedFilter.type)
                ),
            sources: unparsedSources.map((unparsedSource) => JSON.parse(unparsedSource)),
            sourceMetadata: unparsedSourceMetadata ? JSON.parse(unparsedSourceMetadata) : undefined,
            openFolders: unparsedOpenFolders
                .map((unparsedFolder) => JSON.parse(unparsedFolder))
                .filter((parsedFolder) => parsedFolder.length <= hierarchyDepth)
                .map((parsedFolder) => new FileFolder(parsedFolder)),
        };
    }

    public static convertToPython(
        urlComponents: Partial<FileExplorerURLComponents>,
        userOS: string
    ) {
        if (
            (urlComponents?.sources?.length && urlComponents.sources.length > 1) ||
            urlComponents?.sources?.[0]?.name === AICS_FMS_DATA_SOURCE_NAME ||
            !urlComponents?.sources?.[0]?.uri
        ) {
            return "# Coming soon";
        }
        const sourceString = this.convertDataSourceToPython(urlComponents?.sources?.[0], userOS);
        const groupByQueryString =
            urlComponents.hierarchy
                ?.map((annotation) => this.convertGroupByToPython(annotation))
                .join("") || "";

        // Group filters by name and use OR to concatenate same filter values
        const filterGroups = new Map();
        urlComponents.filters?.forEach((filter) => {
            const pythonQueryString = filterGroups.get(filter.name);
            if (!pythonQueryString) {
                filterGroups.set(filter.name, this.convertFilterToPython(filter));
            } else {
                filterGroups.set(
                    filter.name,
                    pythonQueryString.concat(` | ${this.convertFilterToPython(filter)}`)
                );
            }
        });

        // Chain the filters together
        let filterQueryString = "";
        filterGroups.forEach((value) => {
            filterQueryString = filterQueryString.concat(`.query('${value}')`);
        });

        const sortQueryString = urlComponents.sortColumn
            ? this.convertSortToPython(urlComponents.sortColumn)
            : "";
        // const fuzzy = [] // TO DO: support fuzzy filtering

        const hasQueryElements = groupByQueryString || filterQueryString || sortQueryString;
        const imports = "import pandas as pd\n\n";
        const comment = hasQueryElements ? "#Query on dataframe df" : "#No options selected";
        const fullQueryString = `${comment}${
            hasQueryElements &&
            `\ndf_queried = df${groupByQueryString}${filterQueryString}${sortQueryString}`
        }`;
        return `${imports}${sourceString}${fullQueryString}`;
    }

    private static convertSortToPython(sortColumn: FileSort) {
        return `.sort_values(by='${sortColumn.annotationName}', ascending=${
            sortColumn.order == "ASC" ? "True" : "False"
        })`;
    }

    private static convertGroupByToPython(annotation: string) {
        return `.groupby('${annotation}', group_keys=True).apply(lambda x: x)`;
    }

    private static convertFilterToPython(filter: FileFilter) {
        // TO DO: Support querying non-string types
        if (filter.value.includes("RANGE")) {
            return;
            //     let begin, end;
            //     return `\`${filter.name}\`>="${begin}"&\`${filter.name}\`<"${end}"`
        }
        return `\`${filter.name}\`=="${filter.value}"`;
    }

    private static convertDataSourceToPython(source: Source | undefined, userOS: string) {
        const isUsingWindowsOS = userOS === "Windows_NT" || userOS.includes("Windows NT");
        const rawFlagForWindows = isUsingWindowsOS ? "r" : "";

        if (typeof source?.uri === "string") {
            const comment = "#Convert current datasource file to a pandas dataframe";

            // Currently suggest setting all fields to strings; otherwise pandas assumes type conversions
            // TO DO: Address different non-string type conversions
            const code = `df = pd.read_${source.type}(${rawFlagForWindows}'${source.uri}').astype('str')`;
            // This only works if we assume that the file types will only be csv, parquet or json

            return `${comment}\n${code}\n\n`;
        } else if (source?.uri) {
            // Any other type, i.e., File. `instanceof` breaks testing library
            // Adding strings to avoid including unwanted white space
            const inputFileLineComment =
                " # Unable to automatically determine " +
                "local file location in the browser. Modify this variable to " +
                "represent the full path to your .csv, .json, or .parquet data sources\n";
            const inputFileError =
                "if not input_file:\n" +
                '\traise Exception("Must supply the data source location for the query")\n';
            const inputFileCode = 'input_file = ""' + inputFileLineComment + inputFileError;

            const conversionCode = `df = pd.read_${source.type}(input_file).astype('str')`;
            return `${inputFileCode}\n${conversionCode}\n\n`;
        } else return ""; // Safeguard. Should not reach else
    }
}
