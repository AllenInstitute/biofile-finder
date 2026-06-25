import * as React from "react";

import GroupingHierarchy from "../assets/grouping-hierarchy.png";
import GroupingPanel from "../assets/grouping-panel.png";
import QueryingFilters from "../assets/querying-filters.png";
import QueryingResults from "../assets/querying-results.png";
import SharingUrl from "../assets/sharing-url.png";
import Thumbnails from "../assets/thumbnails.png";
import type { UserGuidePageKey } from "../nav";

import type { PageContent } from "./types";

export const ABOUT_CONTENT: Partial<Record<UserGuidePageKey, PageContent>> = {
    "about/overview": {
        title: "Overview",
        sections: [
            {
                id: "what-is-bff",
                heading: "",
                body: (
                    <>
                        <p>
                            <strong>BioFile Finder (BFF)</strong> is a web-based application
                            designed to enable researchers to explore and manage large-scale
                            biological imaging datasets and associated files in a consistent and
                            streamlined way. It enables users to query structured metadata and
                            seamlessly connect results to associated image assets.
                        </p>
                        <p>
                            Built to handle complex, high-volume data, BioFile Finder supports
                            advanced search, filtering, and sorting—making it easier to access,
                            curate, collaborate on, and share datasets. The intuitive interface
                            requires no coding, allowing users to quickly preview data through
                            thumbnails, open files in common industry tools, or visualize them in
                            the companion web-based 3D volume viewer, Vol-E.
                        </p>
                        {/* TODO: Add publication link once paper is available in Nature Methods */}
                    </>
                ),
            },
            {
                id: "who-is-bff-for",
                heading: "Who is BFF for?",
                body: (
                    <>
                        <p>
                            BFF is designed for anyone who needs to explore and manage large
                            collections of biological files, especially those associated with
                            imaging datasets. It is particularly useful for:
                        </p>
                        <ul>
                            <li>
                                <span>Wet-lab scientists</span>
                            </li>
                            <li>
                                <span>Computational biologists</span>
                            </li>
                            <li>
                                <span>Data engineers & platform teams</span>
                            </li>
                            <li>
                                <span>Core facility managers & PIs</span>
                            </li>
                            <li>
                                <span>GLAM & museum professionals</span>
                            </li>
                        </ul>
                        <p>
                            <a href="/user-guide/real-world-use-cases/use-cases">
                                Read detailed scenarios and use cases
                            </a>
                        </p>
                    </>
                ),
            },
            {
                id: "why-use-bff",
                heading: "What makes BFF unique?",
                body: (
                    <>
                        <p>
                            A number of thoughtful features set BFF apart from other similar tools.
                            Key differentiators include:
                        </p>
                        <div className="ug-feature-grid">
                            <div className="ug-feature-card">
                                <span>No infrastructure</span>
                                <br /> BFF works entirely without a server, enabling users to
                                explore and share datasets instantly without setup, deployment, or
                                IT support.
                            </div>
                            <div className="ug-feature-card">
                                <span>Querying power</span>
                                <br /> BFF&apos;s in-browser query system gives full SQL control
                                over arbitrary user metadata. No other tool in this space does that
                                client-side, without a backend.
                            </div>
                            <div className="ug-feature-card">
                                <span>Format agnostic</span>
                                <br /> BFF treats metadata as data (Parquet/CSV), not tied to any
                                specific image format. By contrast, OMERO is deeply tied to
                                Bio-Formats, and tools like SSBD and Zarrcade are tied to specific
                                formats like OME-Zarr.
                            </div>
                            <div className="ug-feature-card">
                                <span>Sharing</span>
                                <br /> BFF&apos;s URL-encoded query state is unique. Most tools
                                either require server access or only share static links to datasets
                                — BFF shares the exact filtered and sorted view as a URL anyone can
                                open instantly.
                            </div>
                        </div>
                    </>
                ),
            },
            {
                id: "bff-comparison-table",
                heading: "BFF and Related Tool Capabilities",
                body: (
                    <>
                        <p>
                            The following table provides a feature overview of BFF alongside other
                            similar, tools.
                        </p>
                        <div
                            className="ug-scroll-container"
                            tabIndex={0}
                            aria-label="Scrollable comparison table"
                        >
                            <div className="ug-scroll-table">
                                <table className="ug-table">
                                    <thead>
                                        <tr>
                                            <th>Feature</th>
                                            <th>BioFile Finder (BFF)</th>
                                            <th>OMERO</th>
                                            <th>IDR</th>
                                            <th>SSBD</th>
                                            <th>Zarrcade</th>
                                            <th>BioImage Archive (BIA)</th>
                                            <th>Quilt</th>
                                            <th>Cytomine</th>
                                            <th>BisQue</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        <tr>
                                            <td>
                                                <strong>Type</strong>
                                            </td>
                                            <td>Desktop/web file browser</td>
                                            <td>Client-server image management</td>
                                            <td>Public image repository</td>
                                            <td>Public dynamics database</td>
                                            <td>OME-Zarr discovery tool</td>
                                            <td>Public image archive</td>
                                            <td>Data versioning platform</td>
                                            <td>Web collaborative analysis</td>
                                            <td>Web image management</td>
                                        </tr>
                                        <tr>
                                            <td>
                                                <strong>Cost</strong>
                                            </td>
                                            <td>Free/open-source</td>
                                            <td>
                                                Free / open-source (self-hosted infrastructure
                                                costs)
                                            </td>
                                            <td>Free (public resource)</td>
                                            <td>Free (public resource)</td>
                                            <td>Free / open-source</td>
                                            <td>Free (public resource)</td>
                                            <td>Free tier; paid plans for teams</td>
                                            <td>Free / open-source (self-hosted)</td>
                                            <td>Free / open-source (self-hosted)</td>
                                        </tr>
                                        <tr>
                                            <td>
                                                <strong>Deployment</strong>
                                            </td>
                                            <td>Local app or static web page</td>
                                            <td>Requires server + PostgreSQL + storage</td>
                                            <td>Hosted by EMBL-EBI</td>
                                            <td>Hosted by RIKEN</td>
                                            <td>Static web page</td>
                                            <td>Hosted by EMBL-EBI</td>
                                            <td>SaaS or self-hosted</td>
                                            <td>Requires server + DB</td>
                                            <td>Requires server + DB</td>
                                        </tr>
                                        <tr>
                                            <td>
                                                <strong>File Format Support</strong>
                                            </td>
                                            <td>Any file type; Parquet, CSV, JSON metadata</td>
                                            <td>150+ microscopy formats via Bio-Formats</td>
                                            <td>Same as OMERO</td>
                                            <td>OME-Zarr, BD5/HDF5</td>
                                            <td>OME-Zarr only</td>
                                            <td>Any bioimaging format</td>
                                            <td>Any file type</td>
                                            <td>TIFF, whole-slide images</td>
                                            <td>Many image formats</td>
                                        </tr>
                                        <tr>
                                            <td>
                                                <strong>Metadata Source</strong>
                                            </td>
                                            <td>User-supplied files (Parquet/CSV) or URLs</td>
                                            <td>Stored in PostgreSQL; key-value annotations</td>
                                            <td>Curated study-level metadata</td>
                                            <td>Curated per-study</td>
                                            <td>Derived from Zarr metadata</td>
                                            <td>Study-level submissions</td>
                                            <td>Package-level metadata</td>
                                            <td>Project/annotation-based</td>
                                            <td>Tag/key-value on images</td>
                                        </tr>
                                        <tr>
                                            <td>
                                                <strong>Dynamic Querying / Filtering</strong>
                                            </td>
                                            <td>
                                                Yes — in-browser SQL via DuckDB; filter, sort, group
                                                by any column
                                            </td>
                                            <td>Yes — HQL/API queries; filter by tag/key-value</td>
                                            <td>Limited — browse by study, screen, gene</td>
                                            <td>Limited — browse by organism/study</td>
                                            <td>No — browse/list only</td>
                                            <td>Limited — search by study/accession</td>
                                            <td>Limited — search by package name</td>
                                            <td>Yes — ontology-based spatial queries</td>
                                            <td>Yes — tag-based queries</td>
                                        </tr>
                                        <tr>
                                            <td>
                                                <strong>Annotation Hierarchy / Grouping</strong>
                                            </td>
                                            <td>
                                                Yes — user-defined nested grouping by any annotation
                                            </td>
                                            <td>Partial — tag groups, datasets, projects</td>
                                            <td>No</td>
                                            <td>No</td>
                                            <td>No</td>
                                            <td>No</td>
                                            <td>No</td>
                                            <td>Partial — project/folder hierarchy</td>
                                            <td>Partial — tag hierarchy</td>
                                        </tr>
                                        <tr>
                                            <td>
                                                <strong>Shareable URLs / Copy-Paste Sharing</strong>
                                            </td>
                                            <td>Yes — query state encoded in URL</td>
                                            <td>
                                                Partial — links to images/datasets, requires server
                                                access
                                            </td>
                                            <td>Yes — public stable URLs per study</td>
                                            <td>Yes — public DOI-based URLs</td>
                                            <td>Yes — public URLs to Zarr stores</td>
                                            <td>Yes — accession-based URLs</td>
                                            <td>Yes — versioned package URLs</td>
                                            <td>Partial — project links, requires login</td>
                                            <td>Partial — resource links, requires server</td>
                                        </tr>
                                        <tr>
                                            <td>
                                                <strong>Works Without a Server</strong>
                                            </td>
                                            <td>
                                                Yes — runs entirely in-browser or as desktop app
                                            </td>
                                            <td>No — requires OMERO.server</td>
                                            <td>N/A (hosted service)</td>
                                            <td>N/A (hosted service)</td>
                                            <td>Yes — static site</td>
                                            <td>N/A (hosted service)</td>
                                            <td>No (SaaS)</td>
                                            <td>No — requires server</td>
                                            <td>No — requires server</td>
                                        </tr>
                                        <tr>
                                            <td>
                                                <strong>Cloud / Remote Data</strong>
                                            </td>
                                            <td>Yes — S3, HTTP/HTTPS URLs</td>
                                            <td>Yes — via OMERO.server with S3 backend</td>
                                            <td>N/A</td>
                                            <td>N/A</td>
                                            <td>Yes — any HTTP-hosted Zarr</td>
                                            <td>N/A</td>
                                            <td>Yes — S3-backed</td>
                                            <td>Limited</td>
                                            <td>Limited</td>
                                        </tr>
                                        <tr>
                                            <td>
                                                <strong>Data Scale</strong>
                                            </td>
                                            <td>Tested to 10M+ rows; limited by browser memory</td>
                                            <td>Millions of images (server-dependent)</td>
                                            <td>~50 TB across studies</td>
                                            <td>Moderate (curated datasets)</td>
                                            <td>Unlimited (just a catalog)</td>
                                            <td>Petabyte-scale archive</td>
                                            <td>Package-size dependent</td>
                                            <td>Large histopathology images</td>
                                            <td>Moderate</td>
                                        </tr>
                                        <tr>
                                            <td>
                                                <strong>Image Viewing</strong>
                                            </td>
                                            <td>Thumbnails; delegates to external viewers</td>
                                            <td>
                                                Built-in multi-dimensional viewer (OMERO.web,
                                                OMERO.figure)
                                            </td>
                                            <td>Built-in viewer (idr.openmicroscopy.org)</td>
                                            <td>Built-in 3D/4D viewer</td>
                                            <td>Links to external Zarr viewers (e.g. Vizarr)</td>
                                            <td>Links to BioStudies viewer</td>
                                            <td>Built-in preview for some types</td>
                                            <td>Built-in annotation/viewer</td>
                                            <td>Built-in multi-dim viewer</td>
                                        </tr>
                                        <tr>
                                            <td>
                                                <strong>User Annotations / Editing</strong>
                                            </td>
                                            <td>Yes — add/edit metadata columns in-browser</td>
                                            <td>Yes — key-value pairs, tags, ratings, ROIs</td>
                                            <td>No (read-only)</td>
                                            <td>No (read-only)</td>
                                            <td>No (read-only)</td>
                                            <td>No (submission-based)</td>
                                            <td>Yes — package metadata</td>
                                            <td>Yes — spatial annotations, ontology terms</td>
                                            <td>Yes — tags, gobjects</td>
                                        </tr>
                                        <tr>
                                            <td>
                                                <strong>Programmatic API</strong>
                                            </td>
                                            <td>DuckDB SQL in-browser; no REST API needed</td>
                                            <td>
                                                Full REST + JSON API; Python (omero-py), Java, CLI
                                            </td>
                                            <td>REST API (same as OMERO)</td>
                                            <td>REST API</td>
                                            <td>None (static JSON)</td>
                                            <td>REST API (BioStudies)</td>
                                            <td>Python SDK, REST API</td>
                                            <td>REST API, Python client</td>
                                            <td>REST API, Python/MATLAB</td>
                                        </tr>
                                        <tr>
                                            <td>
                                                <strong>Multi-User / Auth</strong>
                                            </td>
                                            <td>No — single-user local tool</td>
                                            <td>Yes — LDAP, groups, permissions</td>
                                            <td>Public (no auth)</td>
                                            <td>Public (no auth)</td>
                                            <td>Public (no auth)</td>
                                            <td>Submission requires login</td>
                                            <td>Yes — teams, RBAC</td>
                                            <td>Yes — LDAP, project roles</td>
                                            <td>Yes — user/group permissions</td>
                                        </tr>
                                        <tr>
                                            <td>
                                                <strong>Primary Use Case</strong>
                                            </td>
                                            <td>
                                                Explore &amp; filter large tabular file metadata;
                                                share queries via URL
                                            </td>
                                            <td>
                                                Manage, view &amp; annotate microscopy data for a
                                                lab/institute
                                            </td>
                                            <td>Publish &amp; browse reference image datasets</td>
                                            <td>Share quantitative bio-dynamics data</td>
                                            <td>Discover &amp; link to OME-Zarr datasets</td>
                                            <td>Archive &amp; publish bioimaging data</td>
                                            <td>Version &amp; share data packages</td>
                                            <td>
                                                Collaborative image annotation (pathology, etc.)
                                            </td>
                                            <td>Manage &amp; analyze diverse bio-images</td>
                                        </tr>
                                        <tr>
                                            <td>
                                                <strong>License</strong>
                                            </td>
                                            <td>MIT</td>
                                            <td>AGPL v3</td>
                                            <td>N/A (hosted)</td>
                                            <td>N/A (hosted)</td>
                                            <td>MIT</td>
                                            <td>N/A (hosted)</td>
                                            <td>Apache 2.0</td>
                                            <td>Apache 2.0</td>
                                            <td>BSD</td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </>
                ),
            },
        ],
    },

    "about/feature-highlights": {
        title: "Feature highlights",
        intro:
            "BioFile Finder (BFF) packs a lot of capability into a serverless, browser-based tool. Here is an overview of its key features.",
        sections: [
            {
                id: "in-browser-querying",
                heading: "Powerful in-browser querying",
                body: (
                    <>
                        <p>
                            BFF uses <strong>DuckDB</strong> — a high-performance analytical SQL
                            engine — to run queries entirely in your browser. No server, no backend,
                            no credentials required. Filter, sort, and search across millions of
                            rows of metadata instantly.
                        </p>
                        <ul>
                            <li>Filter by one or more metadata columns simultaneously</li>
                            <li>Sort by any column, ascending or descending</li>
                            <li>Full-text search across all metadata</li>
                            <li>Scales to 10M+ rows, limited only by browser memory</li>
                        </ul>
                        <div className="ug-feature-grid ug-feature-grid--wide">
                            <img
                                src={QueryingFilters}
                                alt="Filter panel showing active filters: Drug Label equals Staurosporine, Structure equals Microtubules, Treatment Group equals Drug, with Treatment Group sorted ascending"
                                className="ug-image"
                            />
                            <img
                                src={QueryingResults}
                                alt="File list showing Microtubules folder with two files visible, Treatment Group column sorted ascending"
                                className="ug-image"
                            />
                        </div>
                    </>
                ),
            },
            {
                id: "dynamic-grouping",
                heading: "Dynamic grouping & hierarchy",
                body: (
                    <>
                        <p>
                            Group files by any combination of metadata columns to create a navigable
                            folder-like hierarchy — without moving or reorganizing your actual
                            files. Switch grouping strategies instantly to explore different
                            dimensions of your dataset.
                        </p>
                        <ul>
                            <li>
                                Nest grouping across multiple levels (e.g., Experiment &rarr; Plate
                                &rarr; Well)
                            </li>
                            <li>Each group shows a count of the files it contains</li>
                            <li>Combine grouping with filters for focused exploration</li>
                            <li>Switch views without affecting the underlying data</li>
                        </ul>
                        <div className="ug-feature-grid ug-feature-grid--wide">
                            <img
                                src={GroupingPanel}
                                alt="Group by panel showing four nested grouping levels: Structure, Drug Label, Drug Concentration, and Timepoint"
                                className="ug-image"
                            />
                            <img
                                src={GroupingHierarchy}
                                alt="File list showing a multi-level folder hierarchy expanded under Microtubules > Staurosporine > 0.5 > 2, revealing individual files"
                                className="ug-image"
                            />
                        </div>
                    </>
                ),
            },
            {
                id: "sharing",
                heading: "Sharing",
                body: (
                    <>
                        <p>
                            Sharing is one of BFF&apos;s most powerful and distinctive features.
                            Every filter, sort, grouping, and column layout you configure is encoded
                            directly into the URL. Copy the link and share it — anyone who opens it
                            sees exactly the same view of the data, without re-running any queries,
                            sending files, or setting anything up.
                        </p>
                        <p>
                            This makes BFF uniquely suited for collaborative research and open
                            science:
                        </p>
                        <ul>
                            <li>
                                <strong>Collaborate instantly</strong> — share your exact filtered
                                view with a colleague in one click; they see the same subset without
                                any setup
                            </li>
                            <li>
                                <strong>Link publications to live data</strong> — tie a figure
                                directly to the specific filtered dataset view that produced it, so
                                readers can explore the full underlying data themselves
                            </li>
                            <li>
                                <strong>No accounts or infrastructure</strong> — shared links work
                                for anyone with a browser, no login required
                            </li>
                            <li>
                                <strong>Persistent and archivable</strong> — links are stable and
                                can be preserved alongside publications or in data repositories
                            </li>
                        </ul>
                        <p>
                            Most tools in this space either require server access to share data or
                            only link to a static dataset. BFF shares the exact filtered, sorted,
                            grouped view — making it a powerful tool for transparent and
                            reproducible science.
                        </p>
                        <img
                            src={SharingUrl}
                            alt="Browser URL bar showing a BFF link with filters, groupings, and query state encoded as URL parameters"
                            className="ug-image-mt"
                        />
                    </>
                ),
            },
            {
                id: "thumbnails",
                heading: "Thumbnail previews",
                body: (
                    <>
                        <p>
                            BFF renders thumbnail previews for files in your dataset so you can
                            visually scan your data without opening each file individually.
                            Thumbnails appear inline in the file list and update dynamically as you
                            filter and group.
                        </p>
                        <ul>
                            <li>
                                Automatically generated for supported file types and accessible URLs
                            </li>
                            <li>
                                Supply your own preview images via a <code>Thumbnail</code> column
                                in your dataset — useful for large or complex files where
                                auto-generation isn&apos;t possible
                            </li>
                            <li>
                                Navigate the filtered file list with arrow keys for rapid visual
                                review
                            </li>
                        </ul>
                        <img
                            src={Thumbnails}
                            alt="Thumbnail grid view showing a Golgi folder with 72 files, each displaying a rendered microscopy image thumbnail"
                            className="ug-image-mt"
                        />
                    </>
                ),
            },
            {
                id: "code-generation",
                heading: "Code generation",
                body: (
                    <p>
                        <i>Content coming soon.</i>
                    </p>
                ),
            },
            {
                id: "viewer-integrations",
                heading: "Viewer integrations",
                body: (
                    <>
                        <p>
                            BFF connects directly to a variety of image viewers — web-based and
                            desktop. Select any file and open it in the viewer best suited for its
                            format and your workflow.
                        </p>
                        <ul>
                            <li>
                                Supported viewers: Vol-E, AGAVE, FIJI, Neuroglancer, Simularium,
                                VolView, and more
                            </li>
                            <li>
                                Open files with a single click from the file list or detail panel
                            </li>
                            <li>
                                Use a metadata descriptor file to define custom viewer links per
                                file
                            </li>
                        </ul>
                        <p>
                            <a href="/user-guide/app-information/supported-viewers#viewer-table">
                                See the image viewer comparison table
                            </a>
                        </p>
                    </>
                ),
            },
        ],
    },
};
