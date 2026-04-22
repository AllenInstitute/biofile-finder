import DatabaseAnnotationService from "../../../core/services/AnnotationService/DatabaseAnnotationService";
import DatabaseFileService from "../../../core/services/FileService/DatabaseFileService";
import FileDownloadServiceNoop from "../../../core/services/FileDownloadService/FileDownloadServiceNoop";
import DatabaseServiceWebWorker from "../../src/services/DatabaseServiceWeb/duckdb-worker.worker";
import FileSet from "../../../core/entity/FileSet";
import FileFilter from "../../../core/entity/FileFilter";
import ExcludeFilter from "../../../core/entity/FileFilter/ExcludeFilter";
import FileSort, { SortOrder } from "../../../core/entity/FileSort";

export interface BenchmarkTask {
    name: string;
    /** Simulate one user action. Receives service layer instances, not raw SQL. */
    run: (
        annotationSvc: DatabaseAnnotationService,
        fileSvc: DatabaseFileService
    ) => Promise<unknown>;
}

/**
 * Suite of tasks defined at the service layer, matching the code paths the app
 * actually executes in response to user interactions.
 *
 * Each task corresponds to a specific user action so benchmark times are
 * directly comparable to what a user experiences.
 */
export const BENCHMARK_TASKS: BenchmarkTask[] = [
    // App startup: loads the column list to populate the annotation picker.
    {
        name: "fetch_annotations",
        run: (a) => a.fetchAnnotations(),
    },

    // Opening a filter picker — three cardinality tiers because query time varies
    // significantly depending on how many distinct values DuckDB must collect.
    // cell_line:     5 distinct values  (low)
    // experiment_id: 100 distinct values (medium)
    // focus_score:   ~unique per row     (high — near-continuous float)
    {
        name: "open_filter_picker_low_cardinality",
        run: (a) => a.fetchValues("cell_line"),
    },
    {
        name: "open_filter_picker_medium_cardinality",
        run: (a) => a.fetchValues("experiment_id"),
    },
    {
        name: "open_filter_picker_high_cardinality",
        run: (a) => a.fetchValues("focus_score"),
    },

    // File list: default view, no filter or sort.
    {
        name: "browse_file_list",
        run: (_, f) => f.getFiles({ fileSet: new FileSet(), from: 0, limit: 100 }),
    },

    // File list sorted by File Size — requires reading the full sort column to rank.
    {
        name: "sort_file_list",
        run: (_, f) =>
            f.getFiles({
                fileSet: new FileSet({ sort: new FileSort("File Size", SortOrder.DESC) }),
                from: 0,
                limit: 100,
            }),
    },

    // Applying a filter: count then browse (fires together when user selects a value).
    {
        name: "filter_count",
        run: (_, f) =>
            f.getCountOfMatchingFiles(new FileSet({ filters: [new FileFilter("cell_line", 3)] })),
    },
    {
        name: "filter_browse",
        run: (_, f) =>
            f.getFiles({
                fileSet: new FileSet({ filters: [new FileFilter("cell_line", 3)] }),
                from: 0,
                limit: 100,
            }),
    },

    // Directory tree: count per folder when "show null groups" is enabled.
    // Fires once per visible folder node.
    {
        name: "null_group_count",
        run: (_, f) =>
            f.getCountOfMatchingFiles(new FileSet({ filters: [new ExcludeFilter("cell_line")] })),
    },

    // Changing the grouping annotation — schema probe + one IS NOT NULL query per schema
    // column, run in parallel (matching app behavior).
    {
        name: "change_grouping",
        run: (a) => a.fetchAvailableAnnotationsForHierarchy(["cell_line"]),
    },

    // Expanding a folder in the directory tree: load second-level values under a
    // specific parent value (cell_line=3 → plate_id values).
    {
        name: "expand_folder",
        run: (a) => a.fetchHierarchyValuesUnderPath(["cell_line", "plate_id"], ["3"], []),
    },
];

/** Create service instances wrapping the given worker for one data source. */
export function createServices(
    db: DatabaseServiceWebWorker,
    sourceName: string
): { annotationSvc: DatabaseAnnotationService; fileSvc: DatabaseFileService } {
    const annotationSvc = new DatabaseAnnotationService({
        databaseService: db,
        dataSourceNames: [sourceName],
    });
    const fileSvc = new DatabaseFileService({
        databaseService: db,
        dataSourceNames: [sourceName],
        downloadService: new FileDownloadServiceNoop(),
    });
    return { annotationSvc, fileSvc };
}
