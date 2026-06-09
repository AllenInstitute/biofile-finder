import { Icon } from "@fluentui/react";
import * as React from "react";

import type { PageContent } from "./types";

export const GETTING_STARTED_CONTENT: Record<string, PageContent> = {
    "getting-started/setup-overview": {
        title: "Setup overview",
        intro:
            "BioFile Finder (BFF) works by connecting a metadata file, which is a spreadsheet or table, to the files you want to explore. Rather than ingesting image data directly, BFF reads a metadata file (CSV, Parquet, or JSON) containing metadata and file references. Once loaded, BFF turns that metadata into an interactive interface for filtering, grouping, searching, previewing, and sharing files.",
        sections: [
            {
                id: "basic-setup",
                heading: "Basic setup",
                body: (
                    <>
                        <h3>1. Create a metadata file describing your dataset</h3>
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
                            <a href="/user-guide/getting-started/creating-a-dataset">
                                Creating a metadata file
                            </a>
                            ,{" "}
                            <a href="/user-guide/getting-started/metadata-guidance">
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
                            <a href="/user-guide/other-resources/storage-options">
                                Storage options
                            </a>
                            ,{" "}
                            <a href="/user-guide/app-information/supported-viewers">
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
                id: "minimum-requirements",
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
                id: "common-workflows",
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
                id: "recommended-setup",
                heading: "Recommended setup",
                body: (
                    <>
                        <h3>Sharing data publicly</h3>
                        <p>
                            If data is intended to be publicly shared — like in a publication —
                            store the dataset and files referenced in the dataset in{" "}
                            <a href="/user-guide/other-resources/storage-options">cloud storage</a>{" "}
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
                                <a href="/user-guide/getting-started/metadata-guidance">
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
                                <a href="#">
                                    Dataset examples <Icon iconName="Flag" className="ug-icon-md" />
                                </a>{" "}
                                for examples to follow when creating a dataset.
                            </li>
                        </ul>
                    </>
                ),
            },
        ],
    },

    "getting-started/creating-a-dataset": {
        title: "Creating a dataset metadata file",
        intro:
            "BioFile Finder (BFF) works by referencing a spreadsheet you provide, populated by key-value pairs that are the metadata associated with your image files.",
        sections: [
            {
                id: "creating-spreadsheet",
                heading: "What is a dataset?",
                body: (
                    <>
                        <p>
                            A BFF dataset is a tabular file where each row represents a file and
                            each column is a piece of metadata about that file. The format is
                            flexible — any columns beyond the required ones are yours to define
                            based on what matters to your workflow.
                        </p>
                        <p>
                            <a href="/user-guide/app-information/specifications">
                                See App information
                            </a>{" "}
                            for accepted file types and size limitations.
                        </p>
                    </>
                ),
            },
            {
                id: "rows-columns",
                heading: "Rows and columns",
                body: (
                    <>
                        <p>
                            <strong>Rows:</strong> Each row in the table should correspond with a
                            file — either on the cloud, a hard drive, or network attached storage.
                            However, you can have a row corresponding to multiple files, or
                            different rows corresponding to the same file.
                        </p>
                        <p>
                            <strong>Columns:</strong> Columns can be anything, but there is one
                            required column and a few special optional columns described below.
                        </p>
                    </>
                ),
            },
            {
                id: "required-columns",
                heading: "Required columns",
                body: (
                    <p>
                        <strong>File Path</strong> — A reference to the file that BFF will attempt
                        to open with relevant applications. This column does not have to be unique.{" "}
                        <a href="/user-guide/other-resources/storage-options">
                            Information about file storage options
                        </a>
                        .
                    </p>
                ),
            },
            {
                id: "optional-columns",
                heading: "Optional special columns",
                body: (
                    <>
                        <p>
                            These columns are optional but enable specific features in BFF when
                            provided.
                        </p>
                        <ul>
                            <li>
                                <strong>Thumbnail</strong> — If provided, should contain the URL to
                                a cloud-hosted image (see{" "}
                                <a href="/user-guide/other-resources/storage-options">
                                    cloud storage options
                                </a>
                                ) and will override any thumbnail BFF will automatically try to
                                generate. Note: BFF cannot automatically generate a thumbnail for
                                all file types and storage locations.
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
                id: "spreadsheet-examples",
                heading: "Spreadsheet (dataset) examples",
                body: (
                    <>
                        <h3>Basic example</h3>
                        <p>
                            Each row is a file. Columns can be anything meaningful to your workflow
                            — here a well position, gene target, and color channel.
                        </p>
                        <table className="ug-table">
                            <thead>
                                <tr>
                                    <th>File Path</th>
                                    <th>Well</th>
                                    <th>Gene</th>
                                    <th>Color</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <td>Abc123.txt</td>
                                    <td>B3</td>
                                    <td>CDH2</td>
                                    <td>Blue</td>
                                </tr>
                                <tr>
                                    <td>Def456.txt</td>
                                    <td>G9</td>
                                    <td>VIM</td>
                                    <td>Green</td>
                                </tr>
                            </tbody>
                        </table>
                        <p>
                            <a href="#">
                                Download this example as CSV{" "}
                                <Icon iconName="Download" className="ug-icon-sm" />{" "}
                                <Icon iconName="Flag" className="ug-icon-md" />
                            </a>
                        </p>
                        <p>
                            <a href="/datasets">Browse open-source datasets</a>
                        </p>
                    </>
                ),
            },
        ],
    },

    "getting-started/metadata-guidance": {
        title: "Metadata guidance",
        intro:
            "Clear, consistent metadata is what turns microscopy data from a static file into something others can actually find, interpret, and reuse. This section outlines recommended metadata practices that support sharing datasets in a way that is both accessible and meaningful to a broad audience — from collaborators to future researchers. Rather than prescribing a rigid standard, the guidance focuses on capturing the essential context needed to understand how the data was generated, how it is structured, and how it can be used. Our hope is that by following these suggestions, you can make your data easier to explore, visualize, and integrate into downstream analyses, while reducing ambiguity and the need for follow-up clarification.",
        sections: [
            {
                id: "recommendations",
                heading: "Recommendations",
                body: (
                    <>
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
                            difficult to search, integrate, and reuse across repositories.
                            FoundingGIDE addresses this by defining a shared set of metadata fields,
                            grounded in common ontologies, that can be consistently applied across
                            studies. This template translates those recommendations into a simple,
                            spreadsheet-based format supporting cross-repository discovery, FAIR
                            data principles, and integration into a broader global image data
                            ecosystem.
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
                            <a href="#">
                                Download FoundingGIDE template CSV{" "}
                                <Icon iconName="Download" className="ug-icon-sm" />{" "}
                                <Icon iconName="Flag" className="ug-icon-md" />
                            </a>
                        </p>
                        <p>Example descriptions for these fields are provided below.</p>
                    </>
                ),
            },
            {
                id: "column-descriptions",
                heading: "Providing column descriptions",
                body: (
                    <>
                        <p>
                            BFF can display tooltips that describe the columns in your dataset if
                            provided an additional file (referenced as a &ldquo;metadata descriptor
                            file&rdquo; in the app). This file must contain three columns:
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
                        <table className="ug-table">
                            <thead>
                                <tr>
                                    <th>Column Name</th>
                                    <th>Description</th>
                                    <th>Type</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <td>Metadata Field</td>
                                    <td>Name of the metadata attribute being described</td>
                                    <td></td>
                                </tr>
                                <tr>
                                    <td>Study Description</td>
                                    <td>Summary of the study&apos;s purpose, design, and scope</td>
                                    <td></td>
                                </tr>
                                <tr>
                                    <td>Authors</td>
                                    <td>List of contributors to the dataset or study</td>
                                    <td></td>
                                </tr>
                                <tr>
                                    <td>Organization</td>
                                    <td>Institution or organization responsible for the dataset</td>
                                    <td></td>
                                </tr>
                                <tr>
                                    <td>Publication</td>
                                    <td>Associated publication or DOI describing the dataset</td>
                                    <td>Open file link</td>
                                </tr>
                                <tr>
                                    <td>License</td>
                                    <td>Usage license governing the dataset (e.g., CC-BY)</td>
                                    <td></td>
                                </tr>
                                <tr>
                                    <td>Release Date</td>
                                    <td>Date the dataset was made publicly available</td>
                                    <td></td>
                                </tr>
                                <tr>
                                    <td>Imaging Method</td>
                                    <td>
                                        Microscopy or imaging modality used (e.g., confocal,
                                        light-sheet)
                                    </td>
                                    <td></td>
                                </tr>
                                <tr>
                                    <td>Cell Line</td>
                                    <td>Cell line used in the experiment</td>
                                    <td></td>
                                </tr>
                                <tr>
                                    <td>Organism</td>
                                    <td>Species from which the sample was derived</td>
                                    <td></td>
                                </tr>
                                <tr>
                                    <td>Gene</td>
                                    <td>Gene(s) of interest or manipulated in the experiment</td>
                                    <td></td>
                                </tr>
                                <tr>
                                    <td>Compound</td>
                                    <td>Chemical compound or treatment applied</td>
                                    <td></td>
                                </tr>
                                <tr>
                                    <td>Antibody</td>
                                    <td>Antibody used for staining or detection</td>
                                    <td></td>
                                </tr>
                                <tr>
                                    <td>Channel — Content</td>
                                    <td>
                                        Imaging channel identifier or label (e.g., Channel 1, GFP)
                                    </td>
                                    <td></td>
                                </tr>
                                <tr>
                                    <td>Channel — Biological Entity</td>
                                    <td>
                                        Biological structure or molecule represented in the channel
                                    </td>
                                    <td></td>
                                </tr>
                                <tr>
                                    <td>Instrument</td>
                                    <td>Microscope or imaging instrument used</td>
                                    <td></td>
                                </tr>
                                <tr>
                                    <td>Dimension</td>
                                    <td>
                                        Dimensionality of the dataset (e.g., 2D, 3D, time series)
                                    </td>
                                    <td></td>
                                </tr>
                                <tr>
                                    <td>Pixel/Voxel Size / Time resolution</td>
                                    <td>Spatial or temporal resolution of the imaging data</td>
                                    <td></td>
                                </tr>
                                <tr>
                                    <td>Study Unique ID</td>
                                    <td>Unique identifier for the overall study</td>
                                    <td></td>
                                </tr>
                                <tr>
                                    <td>Dataset Unique ID</td>
                                    <td>
                                        Unique identifier for a specific dataset within the study
                                    </td>
                                    <td></td>
                                </tr>
                                <tr>
                                    <td>Pathology/Disease</td>
                                    <td>Disease or pathological condition represented</td>
                                    <td></td>
                                </tr>
                                <tr>
                                    <td>Phenotype</td>
                                    <td>Observed or computed phenotype from analysis</td>
                                    <td></td>
                                </tr>
                                <tr>
                                    <td>Organ</td>
                                    <td>Organ or tissue source of the sample</td>
                                    <td></td>
                                </tr>
                                <tr>
                                    <td>Analyzed Data</td>
                                    <td>
                                        Link to derived or processed data (e.g., segmentation,
                                        features)
                                    </td>
                                    <td>Open file link</td>
                                </tr>
                            </tbody>
                        </table>
                        <p>
                            <a href="#">
                                Download this example as CSV{" "}
                                <Icon iconName="Download" className="ug-icon-sm" />{" "}
                                <Icon iconName="Flag" className="ug-icon-md" />
                            </a>
                        </p>
                    </>
                ),
            },
            {
                id: "provenance",
                heading: "File & metadata provenance",
                body: (
                    <p>
                        BFF supports describing relationships between files and metadata via a
                        provenance file.{" "}
                        <a href="/user-guide/getting-started/provenance">
                            See the full provenance guide
                        </a>
                        .
                    </p>
                ),
            },
        ],
    },

    "getting-started/provenance": {
        title: "File & metadata provenance",
        intro:
            'Information about how files relate to each other or to different pieces of metadata can be provided via an additional file called a "Provenance file". Provenance in BioFile Finder (BFF) can describe relationships between files, between a file and a piece of metadata, and between two pieces of metadata.',
        sections: [
            {
                id: "provenance-where",
                heading: "Where to provide the provenance file",
                body: (
                    <p>
                        In BFF, open the data source panel by clicking the dataset name at the top
                        of the app. At the bottom of that panel you will find an optional field
                        labeled <strong>Provenance file</strong>. Paste the URL or drag in the file
                        there to load it alongside your dataset.
                    </p>
                ),
            },
            {
                id: "provenance-format",
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
                        <table className="ug-table">
                            <thead>
                                <tr>
                                    <th>Child</th>
                                    <th>Relationship</th>
                                    <th>Parent</th>
                                    <th>Child Type</th>
                                    <th>Parent Type</th>
                                    <th>Relationship Type</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <td>WellID</td>
                                    <td>is well in</td>
                                    <td>PlateID</td>
                                    <td>entity</td>
                                    <td>entity</td>
                                    <td></td>
                                </tr>
                                <tr>
                                    <td>ColonyImage</td>
                                    <td>is image acquired from</td>
                                    <td>WellID</td>
                                    <td>file</td>
                                    <td>entity</td>
                                    <td></td>
                                </tr>
                                <tr>
                                    <td>SegmentationImage</td>
                                    <td>segmentation_algorithm_v1</td>
                                    <td>ColonyImage</td>
                                    <td>file</td>
                                    <td>file</td>
                                    <td>pointer</td>
                                </tr>
                            </tbody>
                        </table>
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
                            <a href="#">
                                Download this example{" "}
                                <Icon iconName="Download" className="ug-icon-sm" />{" "}
                                <Icon iconName="Flag" className="ug-icon-md" />
                            </a>
                        </p>
                    </>
                ),
            },
            {
                id: "provenance-workflows",
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
                            parent or child entities — for example, clicking a segmentation image
                            will show the colony image it was derived from and the well it
                            originated in.
                        </p>
                        <p>
                            <a href="#">
                                Download example <Icon iconName="Download" className="ug-icon-sm" />{" "}
                                <Icon iconName="Flag" className="ug-icon-md" />
                            </a>
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
                        <p>
                            When provenance spans multiple datasets, BFF displays the dataset origin
                            of each file alongside its metadata. Filtering by dataset source allows
                            you to isolate images from a specific experiment, verify that processing
                            was applied consistently, and trace any figure back to its full source
                            dataset.
                        </p>
                        <p>
                            <a href="#">
                                Download example <Icon iconName="Download" className="ug-icon-sm" />{" "}
                                <Icon iconName="Flag" className="ug-icon-md" />
                            </a>
                        </p>
                    </>
                ),
            },
        ],
    },
};
