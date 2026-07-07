import { Icon } from "@fluentui/react";
import { kebabCase } from "lodash";
import * as React from "react";

import { GroupSlug, Page, PageSlug, SectionHeading } from "./types";

type CsvValue = string | number | boolean | null | undefined;

const quoteCsvValue = (value: CsvValue): string => {
    const normalized = value == null ? "" : String(value);
    const escaped = normalized.replace(/"/g, '""');
    return /[",\n\r]/.test(escaped) ? `"${escaped}"` : escaped;
};

const createCsvDataUri = (rows: CsvValue[][]): string => {
    const csv = rows.map((row) => row.map(quoteCsvValue).join(",")).join("\n");
    return `data:text/csv;charset=utf-8,${encodeURIComponent(csv)}`;
};

const renderUgTable = (rows: CsvValue[][]): React.ReactElement | null => {
    if (rows.length === 0) {
        return null;
    }

    const [headerRow, ...bodyRows] = rows;

    return (
        <table className="ug-table">
            <thead>
                <tr>
                    {headerRow.map((headerCell, index) => (
                        <th key={`header-${index}`}>
                            {headerCell == null ? "" : String(headerCell)}
                        </th>
                    ))}
                </tr>
            </thead>
            <tbody>
                {bodyRows.map((row, rowIndex) => (
                    <tr key={`row-${rowIndex}`}>
                        {row.map((cell, cellIndex) => (
                            <td key={`cell-${rowIndex}-${cellIndex}`}>
                                {cell == null ? "" : String(cell)}
                            </td>
                        ))}
                    </tr>
                ))}
            </tbody>
        </table>
    );
};

const BASIC_METADATA_EXAMPLE_ROWS: CsvValue[][] = [
    ["File Path", "Well", "Gene", "Fluorophore"],
    ["Abc123.txt", "B3", "CDH2", "EGFP"],
    ["Def456.txt", "G9", "VIM", "Alexa Fluor 405"],
];

const REMBI_TEMPLATE_ROWS: CsvValue[][] = [
    [
        "Study type",
        "Study description",
        "General dataset info",
        "Imaging method",
        "Study component description",
        "Identity",
        "Biological entity",
        "Organism",
        "Intrinsic variable",
        "Extrinsic variable",
        "Experimental variables",
        "Experimental status",
        "Location within Biosample",
        "Preparation method",
        "Signal/contrast mechanism",
        "Channel - content",
        "Channel - biological entity",
        "Instrument attributes",
        "Image acquisition parameters",
        "Type",
        "Format & compression",
        "Dimension extents",
        "Size description",
        "Pixel/voxel size description",
        "Channel information",
        "Image processing method",
        "Contrast inversion to TEM",
        "QC info",
        "Spatial and temporal alignment",
        "Fiducials used",
        "Transformation matrix/other info",
        "Related images and relationship",
        "Analysis result type",
        "Data used for analysis",
        "Analysis method and details",
    ],
];

const FOUNDING_GIDE_TEMPLATE_ROWS: CsvValue[][] = [
    [
        "Metadata Field",
        "Study Description",
        "Authors",
        "Organization",
        "Publication",
        "License",
        "Release Date",
        "Imaging Method",
        "Cell Line",
        "Organism",
        "Gene",
        "Compound",
        "Antibody",
        "Channel - Content",
        "Channel - Biological Entity",
        "Instrument",
        "Dimension",
        "Pixel/Voxel Size / Time resolution",
        "Study Unique ID",
        "Dataset Unique ID",
        "Pathology/Disease (Biological Entity)",
        "Phenotype (Analysis Data)",
        "Organ",
        "Analyzed Data",
    ],
];

const COLUMN_DESCRIPTIONS_EXAMPLE_ROWS: CsvValue[][] = [
    ["Column Name", "Description", "Type"],
    ["Metadata Field", "Name of the metadata attribute being described", ""],
    ["Study Description", "Summary of the study's purpose, design, and scope", ""],
    ["Publication", "Associated publication or DOI describing the dataset", "Open file link"],
    [
        "Analyzed Data",
        "Link to derived or processed data (e.g., segmentation, features)",
        "Open file link",
    ],
    ["Authors", "List of contributors to the dataset or study", ""],
    ["Organization", "Institution or organization responsible for the dataset", ""],
    ["License", "Usage license governing the dataset (e.g., CC-BY)", ""],
    ["Release Date", "Date the dataset was made publicly available", ""],
    ["Imaging Method", "Microscopy or imaging modality used (e.g., confocal, light-sheet)", ""],
    ["Cell Line", "Cell line used in the experiment", ""],
    ["Organism", "Species from which the sample was derived", ""],
    ["Gene", "Gene(s) of interest or manipulated in the experiment", ""],
    ["Compound", "Chemical compound or treatment applied", ""],
    ["Antibody", "Antibody used for staining or detection", ""],
    ["Channel - Content", "Imaging channel identifier or label (e.g., Channel 1, GFP)", ""],
    [
        "Channel - Biological Entity",
        "Biological structure or molecule represented in the channel",
        "",
    ],
    ["Instrument", "Microscope or imaging instrument used", ""],
    ["Dimension", "Dimensionality of the dataset (e.g., 2D, 3D, time series)", ""],
    [
        "Pixel/Voxel Size / Time resolution",
        "Spatial or temporal resolution of the imaging data",
        "",
    ],
    ["Study Unique ID", "Unique identifier for the overall study", ""],
    ["Dataset Unique ID", "Unique identifier for a specific dataset within the study", ""],
    ["Pathology/Disease", "Disease or pathological condition represented", ""],
    ["Phenotype", "Observed or computed phenotype from analysis", ""],
    ["Organ", "Organ or tissue source of the sample", ""],
];

const PROVENANCE_SIMPLE_EXAMPLE_ROWS: CsvValue[][] = [
    ["Child", "Relationship", "Parent", "Child Type", "Parent Type", "Relationship Type"],
    ["WellID", "is well in", "PlateID", "entity", "entity", ""],
    ["ColonyImage", "is image acquired from", "WellID", "file", "entity", ""],
    ["SegmentationImage", "segmentation_algorithm_v1", "ColonyImage", "file", "file", "pointer"],
];

export const GETTING_STARTED_CONTENT: Page[] = [
    {
        slug: PageSlug.SetupOverview,
        title: "Setup overview",
        intro:
            "BioFile Finder (BFF) works by connecting a metadata file that you provide, to the files you want to explore. Rather than ingesting image data directly, BFF reads this metadata file that describes your dataset and references the files you want to access (image files, commonly). Once loaded, BFF turns that metadata into an interactive interface for filtering, grouping, searching, previewing, and sharing files.",
        sections: [
            {
                heading: "Basic setup",
                body: (
                    <>
                        <h3>1. Create a metadata file</h3>
                        <p>
                            Prepare a metadata file describing the files in your dataset. The
                            metadata file can be provided as CSV, Parquet, or JSON. Each row
                            typically represents a file, while columns contain metadata such as:
                        </p>
                        <ul>
                            <li>File path</li>
                            <li>Experimental condition</li>
                            <li>Cell line</li>
                            <li>Plate / well</li>
                            <li>Imaging modality</li>
                            <li>Date acquired</li>
                            <li>Any other annotations relevant to your workflow</li>
                        </ul>
                        <p>
                            See:{" "}
                            <a
                                href={`/user-guide/${GroupSlug.GettingStarted}/${PageSlug.CreatingADatasetMetadataFile}`}
                            >
                                Creating a metadata file
                            </a>
                            ,{" "}
                            <a
                                href={`/user-guide/${GroupSlug.GettingStarted}/${PageSlug.MetadataGuidance}`}
                            >
                                Metadata guidance
                            </a>
                        </p>

                        <h3>2. Reference your files</h3>
                        <p>
                            Your metadata file must include file paths or URLs pointing to the files
                            you want BFF to access. Those files can live:
                        </p>
                        <ul>
                            <li>Locally on your computer</li>
                            <li>On network-attached storage</li>
                            <li>In cloud storage</li>
                            <li>In public repositories</li>
                        </ul>
                        <p>
                            BFF is storage agnostic and does not require files to be moved into a
                            proprietary system.
                        </p>
                        <p>
                            See:{" "}
                            <a
                                href={`/user-guide/${GroupSlug.OtherResources}/${PageSlug.StorageOptions}`}
                            >
                                Storage options
                            </a>
                            ,{" "}
                            <a
                                href={`/user-guide/${GroupSlug.AppInformation}/${PageSlug.SupportedViewers}`}
                            >
                                Viewer compatibility
                            </a>
                        </p>

                        <h3>3. Load the metadata file into BFF</h3>
                        <p>Open BFF and either:</p>
                        <ul>
                            <li>Drag and drop a metadata file</li>
                            <li>Paste a URL to file location</li>
                            <li>Open a shared BFF link</li>
                        </ul>
                        <p>
                            Once loaded, BFF allows you to filter and search metadata, group files
                            dynamically, preview and open files in compatible viewers, and share
                            exact dataset views via URL.
                        </p>
                    </>
                ),
            },
            {
                heading: "Minimum requirements",
                body: (
                    <>
                        <p>To use BFF, you only need:</p>
                        <ul>
                            <li>A metadata file (CSV, Parquet, or JSON).</li>
                            <li>Files to reference in the dataset.</li>
                            <li>File paths linking metadata to images.</li>
                        </ul>
                        <p>No backend, database, or server infrastructure is required.</p>
                    </>
                ),
            },
            {
                heading: "Common workflows",
                body: (
                    <table className="ug-table">
                        <thead>
                            <tr>
                                <th>Goal</th>
                                <th>Typical setup</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td>Personal / local exploration</td>
                                <td>Local dataset + local files</td>
                            </tr>
                            <tr>
                                <td>Shared lab dataset</td>
                                <td>Hosted dataset + shared storage</td>
                            </tr>
                            <tr>
                                <td>Public publication companion</td>
                                <td>Hosted dataset + public cloud storage</td>
                            </tr>
                            <tr>
                                <td>Large-scale datasets</td>
                                <td>Parquet + cloud storage</td>
                            </tr>
                            <tr>
                                <td>Metadata validation / QC</td>
                                <td>Dataset + metadata descriptor file</td>
                            </tr>
                            <tr>
                                <td>File lineage / relationship tracking</td>
                                <td>Dataset + provenance file</td>
                            </tr>
                        </tbody>
                    </table>
                ),
            },
            {
                heading: "Recommended setup",
                body: (
                    <>
                        <h3>Sharing data publicly</h3>
                        <p>
                            If data is intended to be publicly shared — like in a publication —
                            store the dataset and files referenced in the dataset in{" "}
                            <a
                                href={`/user-guide/${GroupSlug.OtherResources}/${PageSlug.StorageOptions}`}
                            >
                                cloud storage
                            </a>{" "}
                            to enable readers to explore the dataset and its files via a sharable
                            BFF link (URL).
                        </p>
                        <p>
                            Note: You can use BFF as a way to circumvent having to publish all files
                            by publishing only the metadata file and instructing readers to request
                            files directly. This allows viewers to see metadata about every file in
                            the dataset without you paying for full cloud storage of each file.
                            Building on this approach, you can host thumbnails of each file so
                            readers can get a preview without you paying for full-resolution images
                            to live in the cloud.
                        </p>

                        <h3>Dataset best practices</h3>
                        <ul>
                            <li>
                                Use consistent metadata conventions —{" "}
                                <a
                                    href={`/user-guide/${GroupSlug.GettingStarted}/${PageSlug.MetadataGuidance}`}
                                >
                                    see Metadata guidance
                                </a>{" "}
                                for detailed best practices.
                            </li>
                            <li>
                                If the dataset is over 100,000 files, use Parquet (a columnar
                                storage format designed for high-performance data analytics) for
                                faster performance. BFF can convert your dataset for you, or use any
                                pyarrow-compatible tool like{" "}
                                <a
                                    href="https://pandas.pydata.org/docs/reference/api/pandas.DataFrame.to_parquet.html"
                                    target="_blank"
                                    rel="noreferrer"
                                >
                                    pandas{" "}
                                    <Icon iconName="OpenInNewWindow" className="ug-icon-sm" />
                                </a>
                                .
                            </li>
                            <li>
                                See{" "}
                                <a
                                    href={`/user-guide/${GroupSlug.GettingStarted}/${
                                        PageSlug.CreatingADatasetMetadataFile
                                    }#${kebabCase(SectionHeading.MetadataFileExamples)}`}
                                >
                                    Metadata file examples
                                </a>{" "}
                                for examples to follow when creating a dataset.
                            </li>
                        </ul>
                    </>
                ),
            },
        ],
    },

    {
        slug: PageSlug.CreatingADatasetMetadataFile,
        title: "Creating a metadata file",
        intro:
            "A metadata file is a structured file that describes your dataset and tells BioFile Finder where to find the files you want to explore. Metadata files can be provided in CSV, Parquet, or JSON format.",
        sections: [
            {
                heading: "Structure of a metadata file",
                body: (
                    <>
                        <p>
                            A metadata file is organized as a table where each row typically
                            represents a file in your dataset and each column represents a metadata
                            field describing that file, such as a file path, experimental condition,
                            sample identifier, or other annotation. The structure is flexible—aside
                            from the required columns, you can define metadata fields that best
                            support your workflow.
                        </p>
                        <p>
                            <a
                                href={`/user-guide/${GroupSlug.AppInformation}/${PageSlug.Specifications}`}
                            >
                                See Specifications
                            </a>{" "}
                            for more details.
                        </p>
                    </>
                ),
            },
            {
                heading: "Rows and columns",
                body: (
                    <>
                        <h3>Rows</h3>
                        <p>
                            Each row typically represents a file you want BioFile Finder to explore.
                            Files can be stored locally, on network-attached storage, in cloud
                            storage, or in public repositories.
                        </p>
                        <p>
                            Advanced workflows may reference multiple files from a single row or
                            reference the same file across multiple rows.
                        </p>
                        <h3>Columns</h3>
                        <p>
                            Columns can be anything, but there is one required column and a few
                            Columns represent metadata describing each file. Aside from the required
                            column and a few special optional columns described below, you can
                            define any metadata fields relevant to your workflow.
                        </p>
                    </>
                ),
            },
            {
                heading: "Required columns",
                body: (
                    <>
                        <p>This column is required for BFF to locate and open your files.</p>
                        <ul>
                            <li>
                                <strong>File Path</strong> — A reference to the file that BFF will
                                attempt to open with relevant applications. This column does not
                                have to be unique.{" "}
                                <a
                                    href={`/user-guide/${GroupSlug.OtherResources}/${PageSlug.StorageOptions}`}
                                >
                                    Information about file storage options
                                </a>
                                .
                            </li>
                        </ul>
                    </>
                ),
            },
            {
                heading: "Optional special columns",
                body: (
                    <>
                        <p>These optional columns enable specific features in BFF when provided.</p>
                        <ul>
                            <li>
                                <strong>Thumbnail</strong> — If provided, should contain the URL to
                                a cloud-hosted image and will override any thumbnail BFF will
                                automatically try to generate. Note: BFF cannot automatically
                                generate a thumbnail for all file types and storage locations.{" "}
                                <a
                                    href={`/user-guide/${GroupSlug.OtherResources}/${
                                        PageSlug.StorageOptions
                                    }#${kebabCase(SectionHeading.CloudStorage)}`}
                                >
                                    See cloud storage options
                                </a>
                                .
                            </li>
                            <li>
                                <strong>File Name</strong> — BFF will automatically parse the file
                                name from the path if this is not provided.
                            </li>
                            <li>
                                <strong>File Size</strong> — Should contain the size of the file in
                                bytes. The display automatically converts to a human-readable format
                                and is used during file downloads to provide feedback about download
                                size. If not provided, the size will be approximated during
                                downloads. This is especially important for correct OME-Zarr
                                downloads, as the size for these is difficult to calculate with
                                certainty.
                            </li>
                        </ul>
                    </>
                ),
            },
            {
                heading: SectionHeading.MetadataFileExamples,
                body: (
                    <>
                        <h3>Basic example</h3>
                        <p>
                            Each row is a file. Columns can be anything meaningful to your workflow
                            — here a well position, gene target, and fluorophore.
                        </p>
                        {renderUgTable(BASIC_METADATA_EXAMPLE_ROWS)}
                        <p>
                            <a
                                href={createCsvDataUri(BASIC_METADATA_EXAMPLE_ROWS)}
                                download="bff-basic-metadata-example.csv"
                            >
                                Download this example as CSV{" "}
                                <Icon iconName="Download" className="ug-icon-sm" />
                            </a>
                        </p>
                        <p>
                            <a href="/datasets">Browse open-source datasets</a>
                        </p>
                        <h3>Full metadata guidance</h3>
                        <p>
                            Visit{" "}
                            <a
                                href={`/user-guide/${GroupSlug.GettingStarted}/${PageSlug.MetadataGuidance}`}
                            >
                                Metadata guidance
                            </a>{" "}
                            for a full description of recommended metadata practices, including more
                            CSV examples and templates.
                        </p>
                    </>
                ),
            },
            {
                heading: "Advanced capabilities (optional)",
                body: (
                    <>
                        <p>BFF supports:</p>
                        <ul>
                            <li>
                                <a
                                    href={`/user-guide/${GroupSlug.GettingStarted}/${PageSlug.NestingMetadataColumns}`}
                                >
                                    Nesting metadata columns
                                </a>{" "}
                                — columns that contain structured or repeated sub-fields within each
                                row (for example, multiple wells or treatment conditions per file),
                                formatted in Parquet and JSON.
                            </li>
                            <li>
                                <a
                                    href={`/user-guide/${GroupSlug.GettingStarted}/${PageSlug.DescribingColumns}`}
                                >
                                    Describing columns in your dataset
                                </a>{" "}
                                — human-readable descriptions of the columns themselves.
                            </li>
                            <li>
                                <a
                                    href={`/user-guide/${GroupSlug.GettingStarted}/${PageSlug.FileAndMetadataProvenance}`}
                                >
                                    Describing file and metadata relationships
                                </a>{" "}
                                — relationships between files and metadata, defined using a
                                provenance file.
                            </li>
                        </ul>
                    </>
                ),
            },
        ],
    },

    {
        slug: PageSlug.MetadataGuidance,
        title: "Metadata guidance",
        intro:
            "Clear, consistent metadata is what turns microscopy data from a static file into something others can actually find, interpret, and reuse. This section outlines recommended metadata practices that support sharing datasets in a way that is both accessible and meaningful to a broad audience — from collaborators to future researchers. Rather than prescribing a rigid standard, the guidance focuses on capturing the essential context needed to understand how the data was generated, how it is structured, and how it can be used. Our hope is that by following these suggestions, you can make your data easier to explore, visualize, and integrate into downstream analyses, while reducing ambiguity and the need for follow-up clarification.",
        sections: [
            {
                heading: "Recommendations",
                body: (
                    <>
                        <h3>REMBI</h3>
                        <p>
                            REMBI (Recommended Metadata for Biological Images), published in{" "}
                            <a
                                href="https://www.nature.com/articles/s41592-021-01166-8"
                                target="_blank"
                                rel="noreferrer"
                            >
                                Nature Methods in 2021{" "}
                                <Icon iconName="OpenInNewWindow" className="ug-icon-sm" />
                            </a>
                            , was among the first community-driven efforts to establish a practical
                            and modality-independent framework for describing biological imaging
                            experiments. Rather than prescribing a rigid file format, REMBI defines
                            a structured metadata model organized into a series of logical modules
                            that capture the complete context of an imaging study, including
                            study-level information, biological samples, specimen preparation, image
                            acquisition parameters, image data, image correlations, and image
                            analysis outputs. The framework was designed to support both light and
                            electron microscopy and to align with FAIR data principles by ensuring
                            that image datasets remain interpretable, reproducible, and reusable
                            long after their original publication.
                        </p>
                        <p>
                            <a
                                href={createCsvDataUri(REMBI_TEMPLATE_ROWS)}
                                download="bff-rembi-template.csv"
                            >
                                Download REMBI-based template{" "}
                                <Icon iconName="Download" className="ug-icon-sm" />
                            </a>
                        </p>
                        <h3>FoundingGIDE</h3>
                        <p>
                            The following interpretation of the{" "}
                            <a
                                href="https://founding-gide.eurobioimaging.eu/ontology-and-metadata/"
                                target="_blank"
                                rel="noreferrer"
                            >
                                FoundingGIDE{" "}
                                <Icon iconName="OpenInNewWindow" className="ug-icon-sm" />
                            </a>{" "}
                            metadata guidelines is a CSV template created to operationalize a
                            minimal, harmonized metadata schema that enables interoperability across
                            bioimaging data resources. Because imaging datasets are generated and
                            stored using diverse, often incompatible metadata models, they are
                            difficult to integrate with other datasets and reuse across
                            repositories. FoundingGIDE addressed this by defining a shared set of
                            metadata fields, grounded in common ontologies, that can be consistently
                            applied across studies. This template translates those recommendations
                            into a simple, spreadsheet-based format supporting cross-repository
                            discovery, FAIR data principles, and integration of datasets into a
                            broader global image data ecosystem.
                        </p>
                        <p>
                            Fields included: Metadata Field, Study Description, Authors,
                            Organization, Publication, License, Release Date, Imaging Method, Cell
                            Line, Organism, Gene, Compound, Antibody, Channel — Content, Channel —
                            Biological Entity, Instrument, Dimension, Pixel/Voxel Size / Time
                            resolution, Study Unique ID, Dataset Unique ID, Pathology/Disease,
                            Phenotype, Organ, Analyzed Data.
                        </p>
                        <p>
                            <a
                                href={createCsvDataUri(FOUNDING_GIDE_TEMPLATE_ROWS)}
                                download="bff-foundinggide-template.csv"
                            >
                                Download FoundingGIDE template CSV{" "}
                                <Icon iconName="Download" className="ug-icon-sm" />
                            </a>
                        </p>
                        <p>
                            See example descriptions for these fields in{" "}
                            <a
                                href={`/user-guide/${GroupSlug.GettingStarted}/${PageSlug.DescribingColumns}`}
                            >
                                Describing columns in your dataset
                            </a>
                            .
                        </p>
                    </>
                ),
            },
        ],
    },

    {
        slug: PageSlug.DescribingColumns,
        title: "Describing columns in your dataset",
        intro:
            "Providing descriptions for columns in your datasets helps collaborators and readers understand the meaning of each column, especially when column names are abbreviated or use internal lab terminology.",
        sections: [
            {
                heading: "Providing column descriptions",
                body: (
                    <>
                        <p>
                            BFF can display tooltips that describe the columns in your dataset if
                            provided an additional file, referenced as a{" "}
                            <strong>&ldquo;metadata descriptor file&rdquo;</strong> in the app. This
                            file must contain three columns:
                        </p>
                        <ul>
                            <li>
                                <strong>Column Name</strong> — references a column in the dataset
                                you want to describe
                            </li>
                            <li>
                                <strong>Description</strong> — the description for that column
                            </li>
                            <li>
                                <strong>Type</strong> — the data type. BFF automatically detects
                                most types; the only value you may need to supply is{" "}
                                <code>Open file link</code>, which tells BFF the column represents a
                                link that can be opened with the &ldquo;Open with&hellip;&rdquo;
                                button. This is useful for pointing to alternative viewers or
                                related resources — for example, a column containing a direct link
                                to open a file in a specific tool.
                            </li>
                        </ul>
                        <h3>Example</h3>
                        {renderUgTable(COLUMN_DESCRIPTIONS_EXAMPLE_ROWS)}
                        <p>
                            <a
                                href={createCsvDataUri(COLUMN_DESCRIPTIONS_EXAMPLE_ROWS)}
                                download="bff-column-descriptions-example.csv"
                            >
                                Download this example as CSV{" "}
                                <Icon iconName="Download" className="ug-icon-sm" />
                            </a>
                        </p>
                    </>
                ),
            },
        ],
    },

    {
        slug: PageSlug.NestingMetadataColumns,
        title: "Nesting metadata columns",
        intro:
            "BFF supports nested metadata columns — columns that contain structured or repeated sub-fields within each row. This is useful when a single file has multiple related attributes grouped together, such as multiple treatment conditions, multiple imaging channels, or multiple wells associated with one image.",
        sections: [
            {
                heading: "Why use nested metadata?",
                body: (
                    <>
                        <p>
                            Traditional flat metadata tables work well when each file has a single
                            value for each attribute. But many experiments produce files associated
                            with several related values — for example, a plate image taken under
                            multiple drug doses, or a segmentation file linked to multiple cell
                            lines. Repeating those values across separate rows (one row per
                            condition) means losing the file-level grouping. Putting all values in a
                            single comma-separated string in one column makes filtering and sorting
                            unreliable.
                        </p>
                        <p>Nested metadata columns solve both problems by letting you:</p>
                        <ul>
                            <li>Keep one row per file while storing multiple structured values.</li>
                            <li>
                                Filter and sort on individual sub-fields (e.g., filter by{" "}
                                <code>Well.Dose</code> without losing the surrounding well context).
                            </li>
                            <li>
                                Download selected metadata with full nested structure preserved.
                            </li>
                        </ul>
                    </>
                ),
            },
            {
                heading: "Supported nesting types",
                body: (
                    <>
                        <p>BFF supports two kinds of nested columns:</p>
                        <ul>
                            <li>
                                <strong>STRUCT</strong> — A single structured value with named
                                sub-fields. Use this when each file has exactly one value for each
                                sub-field. Example: a <code>Microscope</code> column with sub-fields{" "}
                                <code>Model</code> and <code>Objective</code>.
                            </li>
                            <li>
                                <strong>STRUCT[] (array of structs)</strong> — A list of structured
                                values, each with the same named sub-fields. Use this when a file
                                can have multiple values for a group of related attributes. Example:
                                a <code>Well</code> column where each file can be associated with
                                several wells, each described by <code>Position</code>,{" "}
                                <code>Dose</code>, and <code>Cell Line</code>.
                            </li>
                        </ul>
                        <p>
                            Sub-fields appear in BFF as dotted annotation names —{" "}
                            <code>Well.Dose</code> or <code>Microscope.Objective</code>. You can
                            filter, sort, and group on any sub-field, and the full nested structure
                            is preserved when you download a metadata manifest.
                        </p>
                    </>
                ),
            },
            {
                heading: "Formatting nested metadata in Parquet",
                body: (
                    <>
                        <p>
                            Parquet is the recommended format for nested metadata because it
                            natively stores STRUCT and STRUCT[] columns with full type information.
                            No additional configuration is needed — BFF reads the schema
                            automatically.
                        </p>
                        <p>
                            The following Python example (using{" "}
                            <a href="https://pandas.pydata.org/" target="_blank" rel="noreferrer">
                                pandas
                            </a>{" "}
                            and{" "}
                            <a
                                href="https://arrow.apache.org/docs/python/"
                                target="_blank"
                                rel="noreferrer"
                            >
                                pyarrow
                            </a>
                            ) creates a dataset with a STRUCT column (<code>Microscope</code>) and a
                            STRUCT[] column (<code>Well</code>):
                        </p>
                        <pre className="ug-code-block">
                            {`import pandas as pd
import pyarrow as pa
import pyarrow.parquet as pq

# Each row is a file.
# "Microscope" is a plain STRUCT (one value per row).
# "Well" is a STRUCT[] (multiple wells per row).
data = [
    {
        "File Path": "/data/img_001.tif",
        "Microscope": {"Model": "Zeiss LSM 980", "Objective": "40x"},
        "Well": [
            {"Position": "B3", "Dose": 0.5, "Cell Line": "HeLa"},
            {"Position": "B4", "Dose": 1.0, "Cell Line": "HeLa"},
        ],
    },
    {
        "File Path": "/data/img_002.tif",
        "Microscope": {"Model": "Leica SP8", "Objective": "63x"},
        "Well": [
            {"Position": "G9", "Dose": 2.0, "Cell Line": "U2OS"},
        ],
    },
]

# Define the explicit Parquet schema
schema = pa.schema([
    pa.field("File Path", pa.string()),
    pa.field("Microscope", pa.struct([
        pa.field("Model", pa.string()),
        pa.field("Objective", pa.string()),
    ])),
    pa.field("Well", pa.list_(pa.struct([
        pa.field("Position", pa.string()),
        pa.field("Dose", pa.float64()),
        pa.field("Cell Line", pa.string()),
    ]))),
])

table = pa.Table.from_pylist(data, schema=schema)
pq.write_table(table, "dataset.parquet")`}
                        </pre>
                        <p>
                            Once loaded into BFF, annotations like <code>Well.Position</code>,{" "}
                            <code>Well.Dose</code>, and <code>Microscope.Objective</code> will
                            appear in the annotation picker and can be used for filtering, grouping,
                            and sorting.
                        </p>
                    </>
                ),
            },
            {
                heading: "Formatting nested metadata in JSON",
                body: (
                    <>
                        <p>
                            In JSON, nested columns are expressed as objects (for STRUCT) or arrays
                            of objects (for STRUCT[]) within each row. The structure of the example
                            above expressed in JSON:
                        </p>
                        <pre className="ug-code-block">
                            {`[
  {
    "File Path": "/data/img_001.tif",
    "Microscope": { "Model": "Zeiss LSM 980", "Objective": "40x" },
    "Well": [
      { "Position": "B3", "Dose": 0.5, "Cell Line": "HeLa" },
      { "Position": "B4", "Dose": 1.0, "Cell Line": "HeLa" }
    ]
  },
  {
    "File Path": "/data/img_002.tif",
    "Microscope": { "Model": "Leica SP8", "Objective": "63x" },
    "Well": [
      { "Position": "G9", "Dose": 2.0, "Cell Line": "U2OS" }
    ]
  }
]`}
                        </pre>
                        <p>
                            BFF infers the schema from the JSON structure. Rows where a nested field
                            is absent or <code>null</code> will have no value for that annotation.
                        </p>
                    </>
                ),
            },
            {
                heading: "Nested metadata in CSV",
                body: (
                    <>
                        <p>
                            CSV does not natively support nested or repeated values. If your source
                            data is in CSV and you need nested metadata, convert it to Parquet or
                            JSON first (for example, using pandas as shown above).
                        </p>
                        <p>
                            If you load a CSV that was originally exported from BFF with nested
                            columns, the nested values will be serialized as strings. BFF will treat
                            those as plain text and will not reconstruct the nested structure.
                        </p>
                    </>
                ),
            },
            {
                heading: "Date and datetime sub-fields",
                body: (
                    <p>
                        Date and datetime values inside nested columns are fully supported. Store
                        them as <code>pa.date32()</code> or{" "}
                        <code>pa.timestamp(&quot;ms&quot;)</code> in Parquet, or as ISO 8601 strings
                        (e.g., <code>&quot;2025-01-10&quot;</code>) in JSON. BFF will recognize the
                        type from the schema and enable date-range filters on those sub-fields.
                    </p>
                ),
            },
            {
                heading: "Tips",
                body: (
                    <ul>
                        <li>
                            Keep sub-field names consistent across rows — BFF derives the annotation
                            list from the schema, so sub-fields that appear only in some rows may
                            produce empty values for others.
                        </li>
                        <li>
                            Avoid deeply nesting more than two or three levels. While BFF supports
                            multiple levels of nesting (e.g., <code>Experiment.Run.Channel</code>),
                            very deep hierarchies can make the annotation picker harder to navigate.
                        </li>
                        <li>
                            If you need sub-fields from both an outer STRUCT[] and an inner STRUCT[]
                            (doubly-nested arrays), the full path is still accessible in the
                            annotation picker. The download will correctly reconstruct the nested
                            structure when you save metadata as JSON, CSV, or Parquet.
                        </li>
                        <li>
                            Use Parquet for large datasets with nested columns — Parquet&apos;s
                            columnar encoding makes sub-field queries significantly faster than JSON
                            for datasets over a few thousand rows.
                        </li>
                    </ul>
                ),
            },
        ],
    },

    {
        slug: PageSlug.FileAndMetadataProvenance,
        title: "Describing file and metadata relationships",
        intro:
            'Information about how files relate to each other or to different pieces of metadata can be provided via an additional file called a "Provenance file". Provenance in BioFile Finder (BFF) can describe relationships between files, between a file and a piece of metadata, and between two pieces of metadata.',
        sections: [
            {
                heading: "Where to provide the provenance file",
                body: (
                    <p>
                        In BFF, open the data source panel by clicking the dataset name at the top
                        of the app. At the bottom of that panel you will find an optional field
                        labeled <strong>&quot;Provenance file&quot;</strong>. Paste the URL or drag
                        in the file there to load it alongside your dataset.
                    </p>
                ),
            },
            {
                heading: "Provenance file format",
                body: (
                    <>
                        <p>The provenance file should contain 6 columns:</p>
                        <ul>
                            <li>
                                <strong>Child</strong> — The column name in the dataset representing
                                the child entity in the relationship.
                            </li>
                            <li>
                                <strong>Relationship</strong> — Defines the relationship between
                                parent and child. If Relationship Type is empty, this should be a
                                human-readable description. If Relationship Type is{" "}
                                <code>pointer</code>, this should be the name of a dataset column
                                that encodes the relationship.
                            </li>
                            <li>
                                <strong>Parent</strong> — The column name in the dataset
                                representing the parent entity.
                            </li>
                            <li>
                                <strong>Child Type</strong> — <code>file</code> if the child is a
                                file in the dataset; <code>entity</code> if it is metadata.
                            </li>
                            <li>
                                <strong>Parent Type</strong> — <code>file</code> if the parent is a
                                file; <code>entity</code> if it is metadata.
                            </li>
                            <li>
                                <strong>Relationship Type</strong> — Empty for a static relationship
                                described in the Relationship field; <code>pointer</code> if the
                                relationship is defined via a dataset column.
                            </li>
                        </ul>
                        <h3>Simple example</h3>
                        {renderUgTable(PROVENANCE_SIMPLE_EXAMPLE_ROWS)}
                        <ul>
                            <li>
                                <strong>Plate → Well:</strong> Wells belong to a plate (simple
                                descriptive relationship).
                            </li>
                            <li>
                                <strong>Well → Colony Image:</strong> Colony images are acquired
                                from wells (image files linked to metadata).
                            </li>
                            <li>
                                <strong>Colony Image → Segmentation Image:</strong> Segmentation
                                images are derived from colony images; the relationship is specified
                                via a pointer to the segmentation algorithm version used.
                            </li>
                        </ul>
                        <p>
                            <a
                                href={createCsvDataUri(PROVENANCE_SIMPLE_EXAMPLE_ROWS)}
                                download="bff-provenance-simple-example.csv"
                            >
                                Download this example{" "}
                                <Icon iconName="Download" className="ug-icon-sm" />
                            </a>
                        </p>
                    </>
                ),
            },
            {
                heading: "Why provenance matters",
                body: (
                    <>
                        <p>
                            Provenance is especially important in microscopy workflows that span
                            multiple levels of biological organization — such as plates, wells, and
                            individual image files. Without clear provenance linking each
                            segmentation file back to its original image, well, and plate context,
                            it becomes difficult to trace results back to the experimental setup.
                            Capturing these relationships ensures that derived data products remain
                            connected to their biological source, enabling validation,
                            troubleshooting, and reproducibility.
                        </p>
                        <p>
                            In BFF, once a provenance file is loaded, each file row in the file list
                            will show a relationship indicator. Expanding a row reveals its linked
                            parent or child entities — for example, given the provenance schema
                            defined above, clicking a segmentation image will show the colony image
                            it was derived from and the well it originated in.
                        </p>
                        <p>
                            Provenance is also critical when a single publication draws on images
                            from multiple datasets. If the origin of each image is not clearly
                            documented — which dataset it came from, how it was selected, whether it
                            was processed consistently — readers and collaborators may struggle to
                            interpret how comparable those images truly are. By maintaining
                            provenance across datasets, researchers can clearly communicate how
                            figures were constructed and allow others to navigate back to the full
                            underlying data for verification or reuse.
                        </p>
                    </>
                ),
            },
        ],
    },
];
