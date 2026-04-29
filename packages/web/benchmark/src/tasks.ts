import DatabaseAnnotationService from "../../../core/services/AnnotationService/DatabaseAnnotationService";
import DatabaseFileService from "../../../core/services/FileService/DatabaseFileService";
import FileDownloadServiceNoop from "../../../core/services/FileDownloadService/FileDownloadServiceNoop";
import DatabaseServiceWebWorker from "../../src/services/DatabaseServiceWeb/duckdb-worker.worker";
import FileSet from "../../../core/entity/FileSet";
import FileFilter, { FilterType } from "../../../core/entity/FileFilter";
import { AnnotationType } from "../../../core/entity/AnnotationFormatter";
import ExcludeFilter from "../../../core/entity/FileFilter/ExcludeFilter";
import FileSort, { SortOrder } from "../../../core/entity/FileSort";

export interface BenchmarkTask {
    name: string;
    /** Timing strategy — see benchmarkSource in index.ts for details. Default: "worker". */
    timing?: "worker" | "wall-clock";
    /**
     * If true, the annotation cache is cleared before each timed iteration so the task
     * always issues a real DuckDB query. Without this, warmup populates the cache and
     * timed iterations return immediately, reporting 0ms.
     */
    resetAnnotationCache?: boolean;
    run: (
        annotationSvc: DatabaseAnnotationService,
        fileSvc: DatabaseFileService
    ) => Promise<unknown>;
}

export const BENCHMARK_TASKS: BenchmarkTask[] = [
    // App startup: loads the column list to populate the annotation picker.
    {
        name: "fetch_annotations",
        resetAnnotationCache: true,
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

    // File list sorted by File Size with two limit sizes. Emulates different zoom levels.
    {
        name: "sort_file_list",
        run: (_, f) =>
            f.getFiles({
                fileSet: new FileSet({ sort: new FileSort("File Size", SortOrder.DESC) }),
                from: 0,
                limit: 50,
            }),
    },
    {
        name: "sort_file_list_large_page",
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

    // Changing the grouping annotation — fires parallel IS NOT NULL queries, one per schema
    // column. Uses wall-clock timing because the queries run in parallel (see benchmarkSource).
    {
        name: "change_grouping",
        timing: "wall-clock",
        run: (a) => a.fetchAvailableAnnotationsForHierarchy(["cell_line"]),
    },

    // Expanding a folder in the directory tree: load second-level values under a
    // specific parent value (cell_line=3 → plate_id values).
    {
        name: "expand_folder",
        run: (a) => a.fetchHierarchyValuesUnderPath(["cell_line", "plate_id"], ["3"], []),
    },

    // Date range filter covering ~half the fixture rows (acquisition_date spans 2024-01-01
    // to 2024-12-31). Exercises DuckDB's date predicate pushdown against the parquet row groups.
    {
        name: "filter_date_range",
        run: (_, f) =>
            f.getFiles({
                fileSet: new FileSet({
                    filters: [
                        new FileFilter(
                            "acquisition_date",
                            "RANGE(2024-01-01,2024-06-30)",
                            FilterType.DEFAULT,
                            AnnotationType.DATE
                        ),
                    ],
                }),
                from: 0,
                limit: 100,
            }),
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
