import AnnotationName from "../Annotation/AnnotationName";
import FileFilter from "../FileFilter";
import FileFolder from "../FileFolder";
import FileSort, { SortOrder } from "../FileSort";
import type { DatasetSources } from "../MarkdownFrontMatter";
import { AICS_FMS_DATA_SOURCE_NAME } from "../../constants";
import { Column } from "../../state/selection/actions";
import type { SourceType } from "../../services/DatabaseService";

// Somewhat arbitrary default column width in pixels;
// used as a fallback when calculating column widths based on content,
// and as the default width when resetting column widths
export const DEFAULT_COLUMN_WIDTH = 150;
export const MINIMUM_COLUMN_WIDTH = 50; // px; somewhat arbitrary;

// These values CANNOT change otherwise it would break compatibility
// with any existing URLs that use these in the encoding
export enum FileView {
    LIST = "1",
    SMALL_THUMBNAIL = "2",
    LARGE_THUMBNAIL = "3",
}

// The formats a source can be read as
export const MARKDOWN_SOURCE_TYPES = ["markdown", "md"] as const;
export const TABULAR_SOURCE_TYPES = ["csv", "json", "parquet"] as const;
export function isMarkdownType(type?: string): boolean {
    return (MARKDOWN_SOURCE_TYPES as readonly any[]).includes(type);
}

/**
 * Whether a source is a dataset description file.
 */
export function isMarkdownSource(source: Source): boolean {
    // A source with nothing to fetch (e.g. AICS FMS) is never a description file.
    if (!source.uri) return false;
    const resource =
        source.uri instanceof File ? source.uri.name : getResourceNameFromSourceUrl(source.uri);
    return isMarkdownType(resource.split(".").pop());
}

export interface Source {
    name: string;
    uri?: string | File;
}

// Components of the application state this captures
export interface SearchParamsComponents {
    columns?: Column[];
    hasUserSelectedColumns?: boolean;
    hierarchy: string[];
    fileView?: FileView;
    sources: Source[];
    sourceMetadata?: Source;
    provenanceSource?: Source; // file containing provenance relationship info
    provOriginId?: string; // currently selected uid of origin for prov graph
    filters: FileFilter[];
    openFolders: FileFolder[];
    sortColumn?: FileSort;
    showNoValueGroups?: boolean; // Include "no value" folders when grouping
}

export const EMPTY_QUERY_COMPONENTS: SearchParamsComponents = {
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
export const DEFAULT_AICS_FMS_QUERY: SearchParamsComponents = {
    columns: [
        { name: AnnotationName.FILE_NAME, width: 300 },
        { name: AnnotationName.KIND, width: 150 },
        { name: AnnotationName.TYPE, width: 200 },
        { name: AnnotationName.FILE_SIZE, width: 100 },
    ],
    fileView: FileView.LIST,
    hierarchy: [],
    openFolders: [],
    sources: [{ name: AICS_FMS_DATA_SOURCE_NAME }],
    filters: [PAST_YEAR_FILTER],
    provenanceSource: {
        name: "AICS",
        uri: "https://biofile-finder-datasets.s3.us-west-2.amazonaws.com/FMS.provenance.csv",
    },
    sortColumn: new FileSort(AnnotationName.UPLOADED, SortOrder.DESC),
};

/**
 * The last meaningful path segment of a source URL, ignoring any query string
 * and any trailing slashes (Delta Lake tables are directories, so their URLs
 * commonly end in "/").
 */
export const getResourceNameFromSourceUrl = (dataSourceURL: string): string => {
    const withoutQuery = dataSourceURL.split("?")[0].replace(/\/+$/, "");
    return withoutQuery.substring(withoutQuery.lastIndexOf("/") + 1);
};

/**
 * The derived name from getResourceNameFromSourceUrl() + a time-based suffix
 */
export const getNameFromSourceUrl = (url: string): string => {
    const name = getResourceNameFromSourceUrl(url);
    return `${name} (${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()})`;
};

// We want to eventually use shorthands and other tricks to
// try to shorten the resulting URL however we can
enum URLQueryArgShorthands {
    COLUMNS = "c",
    FILE_VIEW = "v",
    HAS_USER_SELECTED_COLUMNS = "cs",
    PROVENANCE_ORIGIN_ID = "p",
}

class ColumnCoder {
    private static readonly COLUMN_DELIMITER = ",";
    private static readonly VALUE_DELIMITER = ":";
    private static readonly COLUMN_VALUE_PRECISION = 10; // The divisor used when encoding column widths to shorten the resulting URL; this is an arbitrary choice to balance URL length with precision of column widths
    // Arbitrary URL length limit; default columns beyond this regenerate on load anyway
    private static readonly DEFAULT_COLUMN_LIMIT = 6;

    public static encode(columns: Column[], areColumnsUserSelected = false): string {
        return (
            columns
                // Encode width as divided by COLUMN_VALUE_PRECISION to shorten the resulting URL;
                // this is an arbitrary choice to balance URL length with precision of column widths
                .map(
                    (column) =>
                        `${column.name}${ColumnCoder.VALUE_DELIMITER}${Math.ceil(
                            column.width / ColumnCoder.COLUMN_VALUE_PRECISION
                        )}`
                )
                .slice(
                    0,
                    areColumnsUserSelected ? columns.length : ColumnCoder.DEFAULT_COLUMN_LIMIT
                )
                .join(ColumnCoder.COLUMN_DELIMITER)
        );
    }

    public static decode(encoded: string): Column[] {
        return encoded
            .split(ColumnCoder.COLUMN_DELIMITER)
            .filter((unparsedColumn) => !!unparsedColumn)
            .map((unparsedColumn) => {
                const [name, widthAsStr] = unparsedColumn.split(ColumnCoder.VALUE_DELIMITER);
                const parsedWidth = parseFloat(widthAsStr);
                // The column width was previously encoded as a number between 0 and 1 representing the percentage of available
                // space the column should take up, but this was difficult to work with and unintuitive for users.
                // Now we encode the actual pixel width, which is more straightforward to understand and work with when manually editing URLs.
                // To maintain backwards compatibility with existing URLs, we continue to support previously encoded widths as percentages,
                // but we default them to a default column width in pixels in the decoding process.
                // Also, multiply the parsedWidth by COLUMN_VALUE_PRECISION because it is encoded as the actual width divided by COLUMN_VALUE_PRECISION to
                // shorten the resulting URL; this is an arbitrary choice to balance URL length with precision of column widths.
                const width =
                    parsedWidth <= 1
                        ? DEFAULT_COLUMN_WIDTH
                        : parsedWidth * ColumnCoder.COLUMN_VALUE_PRECISION;
                return { name, width };
            });
    }
}

/**
 * This represents a system for encoding application state information in a way
 * that allows users to copy, share, and paste the result back into the app and have the
 * URL decoded & rehydrated back in.
 */
export default class SearchParams {
    /**
     * Encode this SearchParams into a format easily transferable between users
     * that can be decoded back into the data used to create this SearchParams.
     * Ideally the format this is in would be independent of the format/inner-workings
     * of our application state. As in, the names / system we track data in can change
     * without breaking an existing SearchParams.
     * */
    public static encode(
        urlComponents: Partial<SearchParamsComponents>,
        cachedSourcesFromDescription?: DatasetSources
    ): string {
        const params = new URLSearchParams();
        if (urlComponents.columns?.length) {
            params.append(
                URLQueryArgShorthands.COLUMNS,
                ColumnCoder.encode(urlComponents.columns, urlComponents.hasUserSelectedColumns)
            );
            if (urlComponents.hasUserSelectedColumns) {
                params.append(URLQueryArgShorthands.HAS_USER_SELECTED_COLUMNS, "true");
            }
        }
        // Avoid including default in the URL
        if (urlComponents.fileView && urlComponents.fileView !== FileView.LIST) {
            params.append(URLQueryArgShorthands.FILE_VIEW, urlComponents.fileView);
        }
        urlComponents.hierarchy?.forEach((annotation) => {
            params.append("group", annotation);
        });
        urlComponents.filters?.forEach((filter) => {
            params.append("filter", JSON.stringify(filter.toJSON()));
        });
        urlComponents.openFolders?.map((folder) => {
            params.append("openFolder", JSON.stringify(folder.fileFolder));
        });

        let sourcesToEncode = urlComponents.sources;
        let columnDescriptionSourceAlreadyEncoded = false;
        let provenanceSourceAlreadyEncoded = false;
        // Check if one of sources is a markdown file. If so, parse it for urls.
        // check that those urls match, or else give preference to the overwritten provided sources
        const datasetDescriptionSource = urlComponents.sources?.find(isMarkdownSource);
        if (datasetDescriptionSource) {
            // Only encode sources that aren't already in the markdown file
            const datasetUrl = cachedSourcesFromDescription?.dataSource?.uri;
            sourcesToEncode = datasetUrl
                ? urlComponents.sources?.filter((source) => source.uri !== datasetUrl)
                : urlComponents.sources;
            // Skip source encoding if the markdown already contains the url
            if (
                cachedSourcesFromDescription?.descriptionsSource?.uri ===
                urlComponents.sourceMetadata?.uri
            ) {
                columnDescriptionSourceAlreadyEncoded = true;
            }
            if (
                cachedSourcesFromDescription?.provenanceSource?.uri ===
                urlComponents.provenanceSource?.uri
            ) {
                provenanceSourceAlreadyEncoded = true;
            }
        }
        sourcesToEncode?.map((source) => {
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
        if (urlComponents.sourceMetadata && !columnDescriptionSourceAlreadyEncoded) {
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
        if (urlComponents.provenanceSource && !provenanceSourceAlreadyEncoded) {
            params.append(
                "prov",
                JSON.stringify({
                    ...urlComponents.provenanceSource,
                    uri:
                        typeof urlComponents.provenanceSource.uri === "string" ||
                        urlComponents.provenanceSource.uri instanceof String
                            ? urlComponents.provenanceSource.uri
                            : undefined,
                })
            );
        }
        // Only include the graph origin if we also have a provenance source file,
        // either directly encoded or in the markdown file
        if (
            urlComponents.provOriginId &&
            (urlComponents.provenanceSource || cachedSourcesFromDescription?.provenanceSource)
        ) {
            params.append(URLQueryArgShorthands.PROVENANCE_ORIGIN_ID, urlComponents.provOriginId);
        }
        if (urlComponents.sortColumn) {
            params.append("sort", JSON.stringify(urlComponents.sortColumn.toJSON()));
        }
        if (urlComponents.showNoValueGroups === false) {
            // Only encode when explicitly set to false (non-default); default is true
            params.append("showNulls", "false");
        }

        return params.toString();
    }

    /**
     * Decode a previously encoded SearchParams into components that can be rehydrated into the
     * application state
     */
    public static decode(encodedURL: string): SearchParamsComponents {
        const params = new URLSearchParams(encodedURL.trim());
        if (params.getAll("url").length > 0) {
            return SearchParams.decodeSimpleParams(params);
        }
        return SearchParams.decodeComplexParams(params);
    }

    private static decodeSimpleParams(params: URLSearchParams): SearchParamsComponents {
        const unparsedURLs = params.getAll("url");
        return {
            ...EMPTY_QUERY_COMPONENTS,
            sources: unparsedURLs.map((uri) => ({
                uri,
                name: getNameFromSourceUrl(uri),
            })),
        };
    }

    private static decodeComplexParams(params: URLSearchParams): SearchParamsComponents {
        const unparsedSourceMetadata = params.get("sourceMetadata");
        const unparsedSourceProvenance = params.get("prov");
        const unparsedOpenFolders = params.getAll("openFolder");
        const unparsedFilters = params.getAll("filter");
        const unparsedSources = params.getAll("source");
        const hierarchy = params.getAll("group");
        const unparsedSort = params.get("sort");
        const unparsedColumns = params.get(URLQueryArgShorthands.COLUMNS) || "";
        const hasUserSelectedColumns =
            params.get(URLQueryArgShorthands.HAS_USER_SELECTED_COLUMNS) === "true";
        const showNoValueGroupsString = params.get("showNulls");
        const fileView = (params.get(URLQueryArgShorthands.FILE_VIEW) as FileView) || FileView.LIST;
        const hierarchyDepth = hierarchy.length;
        const provenanceOriginId = params.get(URLQueryArgShorthands.PROVENANCE_ORIGIN_ID);

        const parsedSources = unparsedSources.map((unparsedSource) => JSON.parse(unparsedSource));
        const mayHaveProvSource =
            unparsedSourceProvenance ||
            parsedSources.some((source) => source && isMarkdownSource(source));

        const parsedSort = unparsedSort ? JSON.parse(unparsedSort) : undefined;
        if (
            parsedSort &&
            parsedSort?.order !== SortOrder.ASC &&
            parsedSort?.order !== SortOrder.DESC
        ) {
            throw new Error("Sort order must be ASC or DESC");
        }
        return {
            fileView,
            hierarchy,
            columns: ColumnCoder.decode(unparsedColumns),
            hasUserSelectedColumns,
            filters: unparsedFilters
                .map((unparsedFilter) => JSON.parse(unparsedFilter))
                .map(
                    (parsedFilter) =>
                        new FileFilter(
                            parsedFilter.path ?? parsedFilter.name,
                            parsedFilter.value,
                            parsedFilter.type
                        )
                ),
            openFolders: unparsedOpenFolders
                .map((unparsedFolder) => JSON.parse(unparsedFolder))
                .filter((parsedFolder) => parsedFolder.length <= hierarchyDepth)
                .map((parsedFolder) => new FileFolder(parsedFolder)),
            provenanceSource: unparsedSourceProvenance
                ? JSON.parse(unparsedSourceProvenance)
                : undefined,
            // avoid lengthening query string: only include the graph origin if we also have
            // a provenance source OR dataset description file that may contain a provenance source
            provOriginId: provenanceOriginId && mayHaveProvSource ? provenanceOriginId : undefined,
            showNoValueGroups: showNoValueGroupsString ? JSON.parse(showNoValueGroupsString) : true,
            sortColumn: parsedSort
                ? new FileSort(
                      parsedSort.path ?? parsedSort.annotationName,
                      parsedSort.order || SortOrder.ASC
                  )
                : undefined,
            sources: parsedSources,
            sourceMetadata: unparsedSourceMetadata ? JSON.parse(unparsedSourceMetadata) : undefined,
        };
    }

    public static convertToPython(
        urlComponents: Partial<SearchParamsComponents>,
        userOS: string,
        sourceType?: SourceType
    ) {
        if (
            (urlComponents?.sources?.length && urlComponents.sources.length > 1) ||
            urlComponents?.sources?.[0]?.name === AICS_FMS_DATA_SOURCE_NAME ||
            !urlComponents?.sources?.[0]?.uri
        ) {
            return "# Coming soon";
        }
        const sourceString = this.convertDataSourceToPython(
            urlComponents?.sources?.[0],
            userOS,
            sourceType
        );
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
        // TODO: Support querying non-string types
        if (String(filter.value).includes("RANGE")) return;
        return `\`${filter.name}\`=="${filter.value}"`;
    }

    /**
     * The Python that loads a data source into a dataframe.
     */
    private static convertDataSourceToPythonRead(
        sourceType: SourceType | undefined,
        location: string
    ) {
        // A Delta Lake table is a directory rather than a file, and pandas has no
        // reader for it, so it needs the deltalake package.
        if (sourceType === "delta") {
            return {
                imports: "from deltalake import DeltaTable\n",
                code: `df = DeltaTable(${location}).to_pandas().astype('str')`,
            };
        }

        // Fall back to CSV when the type was never settled, matching how an
        // otherwise unidentifiable data source is loaded.
        return {
            imports: "",
            code: `df = pd.read_${sourceType ?? "csv"}(${location}).astype('str')`,
        };
    }

    private static convertDataSourceToPython(
        source: Source | undefined,
        userOS: string,
        sourceType?: SourceType
    ) {
        const isUsingWindowsOS = userOS === "Windows_NT" || userOS.includes("Windows NT");
        const rawFlagForWindows = isUsingWindowsOS ? "r" : "";

        if (typeof source?.uri === "string") {
            const comment = "#Convert current datasource file to a pandas dataframe";
            const { imports, code } = SearchParams.convertDataSourceToPythonRead(
                sourceType,
                `${rawFlagForWindows}'${source.uri}'`
            );

            return `${imports}${comment}\n${code}\n\n`;
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

            const { imports, code } = SearchParams.convertDataSourceToPythonRead(
                sourceType,
                "input_file"
            );
            return `${imports}${inputFileCode}\n${code}\n\n`;
        } else return ""; // Safeguard. Should not reach else
    }
}
