import { Icon } from "@fluentui/react";
import * as React from "react";

export interface PageContent {
    title: string;
    intro: string;
    sections: { id: string; heading: string; level?: 2 | 3 | 4; body: React.ReactNode }[];
}

export const PAGE_CONTENT: Record<string, PageContent> = {
    "about/overview": {
        title: "Overview",
        intro: "",
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
                            the companion web-based 3D volume viewer, Vole-E.
                        </p>
                        <p>
                            <a href="#">Read publication in Nature Methods</a>
                        </p>
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
                                <span>Wet-lab scientists</span> —{" "}
                                <i>
                                    I have thousands of images and I just want to find the right
                                    ones.
                                </i>
                            </li>
                            <li>
                                <span>Computational biologists</span> —{" "}
                                <i>
                                    I want to query millions of files without writing a pipeline to
                                    do it.
                                </i>
                            </li>
                            <li>
                                <span>Data Engineers & Platform Teams</span> —{" "}
                                <i>
                                    I&apos;d like to provide my users self-service data access
                                    without building a portal.
                                </i>
                            </li>
                            <li>
                                <span>Academic Facility Managers & PIs</span> —{" "}
                                <i>I need to make my shared data actually usable.</i>
                            </li>
                            <li>
                                <span>GLAM & Museum Professionals</span> —{" "}
                                <i>I want to make my collection metadata interactive.</i>
                            </li>
                        </ul>
                        <p>
                            <a href="/user-guide/real-world-use-cases/use-cases-overview">
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
                            A number of thoughful features set BFF apart from other similar tools.
                            Key differentiators include:
                        </p>
                        <ul>
                            <li>
                                <span>No infrastructure</span> — BFF works entirely without a
                                server, enabling users to explore and share datasets instantly
                                without setup, deployment, or IT support. BFF and Zarrcade are the
                                only tools in this space that require no server — tools like OMERO,
                                Cytomine, and BisQue all require significant infrastructure.
                            </li>
                            <li>
                                <span>Querying power</span> — BFF&apos;s in-browser query system
                                gives full SQL control over arbitrary user metadata. No other tool
                                in this space does that client-side, without a backend.
                            </li>
                            <li>
                                <span>Format agnostic</span> — BFF treats metadata as data
                                (Parquet/CSV), not tied to any specific image format. By contrast,
                                OMERO is deeply tied to Bio-Formats, and tools like SSBD and
                                Zarrcade are tied to specific formats like OME-Zarr.
                            </li>
                            <li>
                                <span>Sharing</span> — BFF&apos;s URL-encoded query state is unique.
                                Most tools either require server access or only share static links
                                to datasets — BFF shares the exact filtered and sorted view as a URL
                                anyone can open instantly.
                            </li>
                        </ul>
                    </>
                ),
            },
            {
                id: "bff-comparison-table",
                heading: "BFF comparison table",
                body: (
                    <>
                        <p>
                            The following table highlights how BFF compares to similar tools in the
                            bioimaging data management ecosystem.
                        </p>
                        <div className="ug-scroll-container">
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
                                            <td>Free / open-source</td>
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

    "app-information/specifications": {
        title: "Specifications",
        intro: "Technical specifications for BFF.",
        sections: [
            {
                id: "file-size-limitations",
                heading: "File size and format compatibility",
                body: (
                    <>
                        <p>
                            BFF ingests metadata about biological files (a dataset), not the files
                            themselves. This metadata is intended to be tabular and can be stored as
                            the following formats:
                        </p>
                        <ul>
                            <li>
                                <strong>CSV</strong> — most human readable
                            </li>
                            <li>
                                <strong>Parquet</strong> — most performant
                            </li>
                            <li>
                                <strong>JSON</strong>
                            </li>
                        </ul>
                        <p>
                            <i>Information on file size limitations coming soon.</i>
                        </p>
                        <h3>Files referenced by dataset</h3>
                        <p>
                            Limitations around the files tracked within BFF are imposed by the
                            applications BFF links to for that given file. For example, FIJI will
                            only work with the files that it supports. BFF itself is agnostic to the
                            file types and sizes referenced in a dataset.
                        </p>
                    </>
                ),
            },
            {
                id: "preferred-browsers",
                heading: "Browser and device compatibility",
                body: (
                    <>
                        <p>
                            For best performance and compatibility, we recommend using the latest
                            versions of the following browsers:
                        </p>
                        <ul>
                            <li>Chrome</li>
                            <li>Firefox</li>
                            <li>Opera</li>
                        </ul>
                        <p>
                            BFF is optimized for desktop use and is not currently designed for
                            mobile devices.
                        </p>
                    </>
                ),
            },
            {
                id: "open-source",
                heading: "Open source",
                body: (
                    <p>
                        BioFile Finder is open-source and free to use. You can find the code, report
                        issues, and contribute on{" "}
                        <a
                            href="https://github.com/AllenInstitute/biofile-finder"
                            target="_blank"
                            rel="noreferrer"
                        >
                            GitHub{" "}
                            <Icon
                                iconName="OpenInNewWindow"
                                style={{ fontSize: 11, verticalAlign: "middle" }}
                            />
                        </a>
                        .
                    </p>
                ),
            },
        ],
    },

    "app-information/supported-viewers": {
        title: "Supported viewers",
        intro:
            "BFF links out to a variety of image viewers. Use the information below to choose the right one for your work.",
        sections: [
            {
                id: "decision-guide",
                heading: "Decision guide",
                body: (
                    <>
                        <p>
                            Note: File format will heavily limit viewer options, but when multiple
                            are available, the following information may help guide your decision.
                        </p>
                        <ul>
                            <li>
                                <strong>&ldquo;I need to measure/analyze my images&rdquo;</strong> →{" "}
                                <strong>FIJI</strong>
                            </li>
                            <li>
                                <strong>&ldquo;I need a beautiful 3D render&rdquo;</strong> →{" "}
                                <strong>AGAVE</strong>
                            </li>
                            <li>
                                <strong>
                                    &ldquo;I need to explore a huge dataset in the cloud&rdquo;
                                </strong>{" "}
                                → <strong>Neuroglancer</strong> or <strong>Vol-E</strong>
                            </li>
                            <li>
                                <strong>&ldquo;I need to view a simulation over time&rdquo;</strong>{" "}
                                → <strong>Simularium</strong>
                            </li>
                            <li>
                                <strong>&ldquo;I need to check my OME-Zarr is valid&rdquo;</strong>{" "}
                                → <strong>OME NGFF Validator</strong>
                            </li>
                            <li>
                                <strong>&ldquo;I have DICOM/medical volumes&rdquo;</strong> →{" "}
                                <strong>VolView</strong>
                            </li>
                            <li>
                                <strong>
                                    &ldquo;I just want to glance at a simple file quickly&rdquo;
                                </strong>{" "}
                                → <strong>Browser / OS preview</strong>
                            </li>
                        </ul>
                    </>
                ),
            },
            {
                id: "viewer-table",
                heading: "Image viewer comparison table",
                body: (
                    <>
                        <p>
                            The following table offers comparisons between various supported
                            viewers.
                        </p>
                        <div className="ug-scroll-container">
                            <div className="ug-scroll-table">
                                <table className="ug-table">
                                    <thead>
                                        <tr>
                                            <th>Feature</th>
                                            <th>Vol-E</th>
                                            <th>AGAVE</th>
                                            <th>FIJI / ImageJ</th>
                                            <th>Neuroglancer</th>
                                            <th>OME NGFF Validator</th>
                                            <th>Browser (web)</th>
                                            <th>Simularium</th>
                                            <th>VolView</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        <tr>
                                            <td>
                                                <strong>Type</strong>
                                            </td>
                                            <td>Web-based 3D volume viewer</td>
                                            <td>Desktop GPU-accelerated volume renderer</td>
                                            <td>Desktop image analysis suite</td>
                                            <td>Web-based volumetric viewer</td>
                                            <td>Web-based validation tool</td>
                                            <td>Native file preview</td>
                                            <td>Web-based simulation viewer</td>
                                            <td>Web-based 3D volume viewer</td>
                                        </tr>
                                        <tr>
                                            <td>
                                                <strong>Platform</strong>
                                            </td>
                                            <td>Web app (browser)</td>
                                            <td>Desktop (Windows, macOS, Linux)</td>
                                            <td>Desktop (Windows, macOS, Linux)</td>
                                            <td>Web app (browser)</td>
                                            <td>Web app (browser)</td>
                                            <td>Desktop (OS-native)</td>
                                            <td>Web app (browser)</td>
                                            <td>Web app (browser)</td>
                                        </tr>
                                        <tr>
                                            <td>
                                                <strong>Installation required</strong>
                                            </td>
                                            <td>No</td>
                                            <td>Yes (standalone app)</td>
                                            <td>Yes (Java-based)</td>
                                            <td>No</td>
                                            <td>No</td>
                                            <td>No (built into OS)</td>
                                            <td>No</td>
                                            <td>No</td>
                                        </tr>
                                        <tr>
                                            <td>
                                                <strong>Cost</strong>
                                            </td>
                                            <td>Free / open-source</td>
                                            <td>Free / open-source</td>
                                            <td>Free / open-source</td>
                                            <td>Free / open-source</td>
                                            <td>Free / open-source</td>
                                            <td>Free (bundled with OS)</td>
                                            <td>Free / open-source</td>
                                            <td>Free / open-source</td>
                                        </tr>
                                        <tr>
                                            <td>
                                                <strong>Primary use case</strong>
                                            </td>
                                            <td>
                                                Interactive 3D volume rendering of microscopy data
                                            </td>
                                            <td>
                                                High-quality cinematic 3D rendering and path tracing
                                            </td>
                                            <td>
                                                General-purpose image analysis, measurement, and
                                                processing
                                            </td>
                                            <td>
                                                Explore large-scale connectomics / volumetric neuro
                                                datasets
                                            </td>
                                            <td>
                                                Validate OME-Zarr/NGFF file structure and metadata
                                                compliance
                                            </td>
                                            <td>Quick preview of standard image/video files</td>
                                            <td>
                                                Visualize agent-based biological simulations over
                                                time
                                            </td>
                                            <td>
                                                Clinical and research DICOM/volume visualization
                                            </td>
                                        </tr>
                                        <tr>
                                            <td>
                                                <strong>Supported formats</strong>
                                            </td>
                                            <td>OME-Zarr, TIFF, OME-TIFF</td>
                                            <td>
                                                OME-TIFF, TIFF, CZI, LIF, and other microscopy
                                                formats
                                            </td>
                                            <td>100+ formats via Bio-Formats</td>
                                            <td>Precomputed, N5, Zarr, NIFTI</td>
                                            <td>OME-Zarr (NGFF) only</td>
                                            <td>JPEG, PNG, TIFF, MP4, PDF (OS-dependent)</td>
                                            <td>Simularium, CytoSim, ReaDDy, Smoldyn</td>
                                            <td>DICOM, NIFTI, MHA, VTI, NRRD, Zarr</td>
                                        </tr>
                                        <tr>
                                            <td>
                                                <strong>3D volume rendering</strong>
                                            </td>
                                            <td>Yes — real-time ray marching</td>
                                            <td>Yes — GPU path tracing, cinematic quality</td>
                                            <td>Limited — 3D Viewer plugin</td>
                                            <td>Yes — multi-scale, GPU-accelerated</td>
                                            <td>No</td>
                                            <td>No</td>
                                            <td>Yes — 3D agent trajectories and meshes</td>
                                            <td>Yes — GPU-accelerated ray casting</td>
                                        </tr>
                                        <tr>
                                            <td>
                                                <strong>Multi-channel support</strong>
                                            </td>
                                            <td>Yes</td>
                                            <td>Yes</td>
                                            <td>Yes</td>
                                            <td>Yes</td>
                                            <td>Validates channel metadata</td>
                                            <td>No</td>
                                            <td>N/A</td>
                                            <td>Yes</td>
                                        </tr>
                                        <tr>
                                            <td>
                                                <strong>Time series / 4D</strong>
                                            </td>
                                            <td>Yes</td>
                                            <td>Yes</td>
                                            <td>Yes</td>
                                            <td>Limited</td>
                                            <td>Validates time dimension metadata</td>
                                            <td>No</td>
                                            <td>Yes — primary feature</td>
                                            <td>Limited</td>
                                        </tr>
                                        <tr>
                                            <td>
                                                <strong>Large data / streaming</strong>
                                            </td>
                                            <td>Yes — streams OME-Zarr from cloud/HTTP</td>
                                            <td>No — loads full volume into GPU memory</td>
                                            <td>Limited</td>
                                            <td>Yes — designed for petascale</td>
                                            <td>Validates metadata only</td>
                                            <td>No</td>
                                            <td>Streams from URL</td>
                                            <td>Yes — progressive loading</td>
                                        </tr>
                                        <tr>
                                            <td>
                                                <strong>Cloud / remote data</strong>
                                            </td>
                                            <td>Yes — HTTP/S3 URLs</td>
                                            <td>No — local files only</td>
                                            <td>Limited</td>
                                            <td>Yes — GCS, S3, HTTP</td>
                                            <td>Yes — validates remote URLs</td>
                                            <td>No</td>
                                            <td>Yes</td>
                                            <td>Yes</td>
                                        </tr>
                                        <tr>
                                            <td>
                                                <strong>Collaborative / sharing</strong>
                                            </td>
                                            <td>Shareable URL with view state</td>
                                            <td>No</td>
                                            <td>No</td>
                                            <td>Yes — URL encodes full view state</td>
                                            <td>Shareable validation URL</td>
                                            <td>No</td>
                                            <td>Shareable URL</td>
                                            <td>Shareable URL via hosted instance</td>
                                        </tr>
                                        <tr>
                                            <td>
                                                <strong>Best for</strong>
                                            </td>
                                            <td>
                                                Quick interactive exploration of cloud-hosted
                                                OME-Zarr volumes
                                            </td>
                                            <td>
                                                High-quality figures and movies of 3D microscopy
                                                data
                                            </td>
                                            <td>Comprehensive image analysis and scripting</td>
                                            <td>
                                                Browsing terabyte+ volumetric datasets in the cloud
                                            </td>
                                            <td>Checking OME-Zarr files before sharing</td>
                                            <td>Quickly previewing a standard image file</td>
                                            <td>
                                                Viewing and sharing spatiotemporal biological
                                                simulations
                                            </td>
                                            <td>
                                                Medical/research volumes with clinical-style tools
                                            </td>
                                        </tr>
                                        <tr>
                                            <td>
                                                <strong>Limitations</strong>
                                            </td>
                                            <td>No analysis tools; limited format support</td>
                                            <td>Requires dedicated GPU; local files only</td>
                                            <td>
                                                Basic 3D rendering; struggles with very large
                                                datasets
                                            </td>
                                            <td>
                                                Steep learning curve; specific pre-tiled formats
                                                only
                                            </td>
                                            <td>Validation only; OME-Zarr only</td>
                                            <td>No scientific image capabilities</td>
                                            <td>Simulation data only</td>
                                            <td>Limited microscopy format support</td>
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

    "real-world-use-cases/use-cases-overview": {
        title: "Use cases & scenarios",
        intro:
            "BFF is flexible enough to fit many different workflows and contexts. This page highlights common use cases observed across research labs, core facilities, and data teams — along with real-world scenarios showing how different types of users leverage BFF in their work.",
        sections: [
            {
                id: "use-case-table",
                heading: "How people use BFF",
                body: (
                    <>
                        <p>This table is summary of the in-depth use cases described below.</p>
                        <table className="ug-table">
                            <thead>
                                <tr>
                                    <th>Use case</th>
                                    <th>Key BFF actions</th>
                                    <th>Time saved vs. manual</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <td>
                                        <strong>Explore screening results</strong>
                                    </td>
                                    <td>
                                        Group by plate/treatment; filter by phenotype; share URL
                                    </td>
                                    <td>Hours of scripting per query</td>
                                </tr>
                                <tr>
                                    <td>
                                        <strong>Validate metadata</strong>
                                    </td>
                                    <td>
                                        Filter for blanks/duplicates; group to check counts; export
                                        errors
                                    </td>
                                    <td>Days of spreadsheet auditing</td>
                                </tr>
                                <tr>
                                    <td>
                                        <strong>Inspect image subsets</strong>
                                    </td>
                                    <td>
                                        Multi-filter to exact subset; open in viewer; arrow-key
                                        navigation
                                    </td>
                                    <td>Hunting through folders by hand</td>
                                </tr>
                                <tr>
                                    <td>
                                        <strong>Perform QC on datasets</strong>
                                    </td>
                                    <td>
                                        Aggregate counts per group; filter for anomalies;
                                        cross-validate columns
                                    </td>
                                    <td>Custom scripts per dataset</td>
                                </tr>
                                <tr>
                                    <td>
                                        <strong>Manage image inventory</strong>
                                    </td>
                                    <td>
                                        Host metadata file; browse by any column; shareable filtered
                                        URLs
                                    </td>
                                    <td>Building and maintaining a web portal</td>
                                </tr>
                                <tr>
                                    <td>
                                        <strong>Compare across experimental dimensions</strong>
                                    </td>
                                    <td>
                                        Pivot/group across multiple metadata axes (e.g., cell line ×
                                        staining × condition); rapidly switch views
                                    </td>
                                    <td>Rewriting analysis scripts per comparison</td>
                                </tr>
                                <tr>
                                    <td>
                                        <strong>Collaborative data exploration</strong>
                                    </td>
                                    <td>
                                        Share filtered views; maintain consistent dataset state
                                        across users; parallel exploration
                                    </td>
                                    <td>Back-and-forth file exchange and re-alignment</td>
                                </tr>
                                <tr>
                                    <td>
                                        <strong>Publish interactive datasets</strong>
                                    </td>
                                    <td>
                                        Share public BFF links tied to figures; enable readers to
                                        explore full datasets in-browser
                                    </td>
                                    <td>Building custom portals or static supplements</td>
                                </tr>
                            </tbody>
                        </table>
                    </>
                ),
            },
            {
                id: "explore-screening",
                heading: "Explore screening results",
                level: 3,
                body: (
                    <>
                        <p>
                            A high-content screening run produces tens of thousands of images across
                            hundreds of wells, multiple plates, and several time points. The
                            pipeline outputs a Parquet or CSV manifest linking each image file to
                            its well position, compound treatment, concentration, cell line, and
                            measured phenotype scores.
                        </p>
                        <h4>Solution using BFF</h4>
                        <p>
                            Load the manifest into BFF and immediately group files by Plate &gt;
                            Treatment &gt; Concentration to see how many images exist at each
                            condition. Filter to a specific compound and sort by phenotype score to
                            surface the most interesting wells. Click into a well to see thumbnails
                            of every image at that position. Share the filtered view with a
                            colleague by copying the URL — they see exactly the same subset without
                            re-running any queries.
                        </p>
                        <h4>Alternative use case</h4>
                        <p>
                            A genomics core runs CRISPR screens and outputs per-guide results as a
                            CSV. Researchers load it into BFF to filter by gene target, sort by
                            effect size, and quickly identify which guides to follow up on — without
                            writing R or Python code.
                        </p>
                    </>
                ),
            },
            {
                id: "validate-metadata",
                heading: "Validate metadata",
                level: 3,
                body: (
                    <>
                        <p>
                            Before publishing a dataset or submitting to a repository, you need to
                            confirm that every file has complete, consistent metadata — no missing
                            cell lines, no mislabeled plates, no blank file paths.
                        </p>
                        <h4>Solution using BFF</h4>
                        <p>
                            Load your metadata file and use BFF&apos;s filters to find gaps. Group
                            by &quot;Cell Line&quot; and look for a blank or &quot;(No value)&quot;
                            group — those are your missing entries. Sort by &quot;File Path&quot; to
                            spot duplicates or malformed paths. Filter for rows where
                            &quot;Treatment&quot; is empty to find unlabeled conditions. Use the
                            aggregate count at each folder level to verify expected file counts per
                            condition (e.g., &quot;I should have 96 images per plate — any plate
                            with fewer has missing data&quot;). Export the problematic subset as a
                            CSV for correction.
                        </p>
                        <h4>Alternative use case</h4>
                        <p>
                            A museum digitization team loads their specimen catalog CSV into BFF to
                            check for records missing accession numbers, blank taxonomic
                            classifications, or broken file paths to scans — catching errors before
                            ingesting into their collection management system.
                        </p>
                    </>
                ),
            },
            {
                id: "inspect-subsets",
                heading: "Inspect subsets of images",
                level: 3,
                body: (
                    <>
                        <p>
                            You don&apos;t want to look at all 50,000 images. You want to look at a
                            very specific slice — maybe failed QC images, or images from a
                            particular experimental condition, or everything captured on a specific
                            date.
                        </p>
                        <h4>Solution using BFF</h4>
                        <p>
                            Apply filters to narrow down to exactly the subset you care about:
                            &quot;Cell Line = iPSC&quot; AND &quot;Plate = 007&quot; AND &quot;QC
                            Status = Failed&quot;. The file list updates instantly to show only
                            matching files. Click any file to see its full metadata in the detail
                            panel. Open the image directly in your preferred viewer (FIJI, AGAVE,
                            Neuroglancer, or the browser) to visually inspect it. Navigate through
                            the filtered list with arrow keys to quickly scan through the subset
                            one-by-one.
                        </p>
                        <h4>Alternative use case</h4>
                        <p>
                            A pathology lab filters their slide inventory to all H&amp;E-stained
                            tissue sections from a specific patient cohort and date range, then
                            opens each in their whole-slide viewer to confirm stain quality before
                            analysis.
                        </p>
                    </>
                ),
            },
            {
                id: "perform-qc",
                heading: "Perform QC on datasets",
                level: 3,
                body: (
                    <>
                        <p>
                            Quality control means systematically checking that your data meets
                            expectations — correct file counts, valid value ranges, no corrupted
                            entries, consistent naming. Doing this manually in Excel breaks down
                            past a few thousand rows.
                        </p>
                        <h4>Solution using BFF</h4>
                        <p>
                            Load a 2-million-row Parquet manifest and immediately see the total file
                            count in the aggregate info bar. Group by &quot;Experiment &gt; Plate
                            &gt; Well&quot; and check that each well has the expected number of
                            images — any well showing a lower count is a red flag. Filter for files
                            where &quot;File Size&quot; is 0 to find corrupt or empty files. Sort by
                            &quot;Date Acquired&quot; to verify temporal consistency. Group by
                            &quot;Instrument&quot; to check that all files came from the expected
                            microscope. Apply multiple filters simultaneously to cross-validate:
                            &quot;If Plate = Control, then Treatment should be DMSO&quot; — filter
                            for Control plates with non-DMSO treatments to find mislabeled rows.
                        </p>
                        <h4>Alternative use case</h4>
                        <p>
                            A data engineer receives a new batch of sequencing metadata from a
                            collaborator and loads it into BFF to check for duplicate sample IDs,
                            verify that every file path resolves to an existing object in S3 (by
                            sorting/filtering paths), and confirm that all expected runs are
                            represented before ingesting into the pipeline.
                        </p>
                    </>
                ),
            },
            {
                id: "manage-inventory",
                heading: "Manage image inventory",
                level: 3,
                body: (
                    <>
                        <p>
                            You or your team have accumulated a large collection of files over
                            months or years. They live across local drives, shared network storage,
                            or cloud buckets. You have metadata about them — maybe a database
                            export, maybe a painstakingly maintained spreadsheet — and you need an
                            easy way to browse, search, and share access to this inventory without
                            maintaining a server.
                        </p>
                        <h4>Solution using BFF</h4>
                        <p>
                            Export your inventory as a Parquet file (or maintain it as a CSV) with
                            columns for file path, file name, and any annotations that matter to
                            your team (project, investigator, organism, imaging modality, date,
                            etc.). Host the file on a web server, S3 bucket, or just keep it local.
                            Point BFF at it. Your entire team can now browse the inventory by any
                            column, search for specific files, and open them directly. Add a source
                            metadata file to provide human-readable descriptions for each column.
                            When someone asks &quot;do we have any confocal images of iPSC-derived
                            cardiomyocytes from 2024?&quot;, the answer is three clicks away instead
                            of a Slack thread.
                        </p>
                        <h4>Alternative use case</h4>
                        <p>
                            A natural history museum has 200,000 digitized specimen records in a CSV
                            exported from their collection database. They host a BFF instance on
                            their website so visiting researchers can browse specimens by taxonomy,
                            collection site, and date — filtering to exactly the subset relevant to
                            their study and downloading a manifest of matching file paths.
                        </p>
                    </>
                ),
            },
            {
                id: "real-world-scenarios",
                heading: "Real-world scenarios",
                body: (
                    <>
                        <h3>Wet-lab scientists</h3>
                        <p>
                            <i>
                                I have thousands of images and I just want to find the right ones.
                            </i>
                        </p>
                        <p>
                            You ran a plate screen last week and now need to find every image from
                            Well A3 treated with Drug X. Your files are scattered across folders,
                            drives, or cloud storage, with no easy way to search by experimental
                            conditions. BFF lets you load a spreadsheet of your file metadata and
                            instantly filter, sort, and group by any column—cell line, treatment,
                            plate, date, or anything else you need. No coding, no databases, no IT
                            tickets. Just drag, drop, and find your files.
                        </p>
                        <h3>Computational biologists</h3>
                        <p>
                            <i>
                                I want to query millions of files without writing a pipeline to do
                                it.
                            </i>
                        </p>
                        <p>
                            You have a Parquet manifest with 10 million rows of imaging metadata.
                            You need to pull a specific subset for your next analysis run. BFF runs
                            full SQL queries in your browser via DuckDB—no server, no cluster, no
                            credentials. Filter by any combination of annotations, copy out the file
                            paths you need, and get back to your actual work. Share your exact query
                            with a collaborator by copying the URL.
                        </p>
                        <h3>Data Engineers &amp; Platform Teams</h3>
                        <p>
                            <i>
                                I want to give users self-service data access without building a
                                portal.
                            </i>
                        </p>
                        <p>
                            Your team maintains the imaging pipeline. Scientists keep asking you to
                            &quot;just pull all the files where...&quot; and it turns into a JIRA
                            ticket every time. BFF is a zero-infrastructure frontend: point it at a
                            Parquet file on S3 or a CSV on a web server and your users can explore,
                            filter, and export on their own. No backend to deploy, no API to
                            maintain, no accounts to manage. Host a static web page and you&apos;re
                            done.
                        </p>
                        <h3>Academic Facility Managers &amp; PIs</h3>
                        <p>
                            <i>I need to make my shared data actually usable.</i>
                        </p>
                        <p>
                            You run a core imaging facility or oversee a lab generating terabytes of
                            data. Your shared drive has 50,000 files and a naming convention that
                            made sense two years ago. BFF turns any metadata spreadsheet into a
                            searchable, filterable, shareable interface. Publish a dataset with a
                            BFF link and reviewers, collaborators, or new lab members can explore it
                            immediately—no software to install, no accounts to create.
                        </p>
                        <h3>GLAM &amp; Museum Professionals</h3>
                        <p>
                            <i>I want to make my collection metadata interactive.</i>
                        </p>
                        <p>
                            You have a CSV with 200,000 digitized specimens, each with accession
                            numbers, taxonomic classifications, collection dates, and file paths to
                            high-resolution scans. BFF turns that spreadsheet into a browsable,
                            filterable, groupable interface—right in the browser. Let researchers
                            explore your collection by species, date range, or geographic origin.
                            Share a filtered view as a URL. No web developer needed.
                        </p>
                    </>
                ),
            },
        ],
    },

    "real-world-use-cases/example-aics": {
        title: "The cell science accelerator at Allen Institute",
        intro: "BFF was used in publication by the cell science accelerator at Allen Institute.",
        sections: [
            {
                id: "publication",
                heading: "",
                body: (
                    <>
                        <p>
                            <a
                                href="https://www.biorxiv.org/content/10.1101/2024.08.16.608353v1"
                                target="_blank"
                                rel="noreferrer"
                            >
                                Open publication{" "}
                                <Icon
                                    iconName="OpenInNewWindow"
                                    style={{ fontSize: 11, verticalAlign: "middle" }}
                                />
                            </a>
                            <br />
                            <a
                                href="https://bff.allencell.org/app?c=Gene%3A0.25%2CCell+Line%3A0.25%2CFile+Name%3A0.25%2CDrug+Concentration%3A0.25&group=Experimental+Condition&group=Gene&openFolder=%5B%222D+PLF+colony+BMP4+EMT%22%5D&openFolder=%5B%222D+PLF+colony+BMP4+EMT%22%2C%22CDH1%22%5D&source=%7B%22name%22%3A%22imaging_and_segmentation_data.csv+%2815%2F08%2F2025+13%3A09%3A25%29%22%2C%22type%22%3A%22csv%22%2C%22uri%22%3A%22https%3A%2F%2Fallencell.s3.amazonaws.com%2Faics%2Femt_timelapse_dataset%2Fmanifests%2Fimaging_and_segmentation_data.csv%22%7D&sourceMetadata=%7B%22name%22%3A%22Imaging_and_segmentation_data_column_description.csv+%2815%2F08%2F2025+13%3A09%3A32%29%22%2C%22type%22%3A%22csv%22%2C%22uri%22%3A%22https%3A%2F%2Fallencell.s3.amazonaws.com%2Faics%2Femt_timelapse_dataset%2Fmanifests%2FImaging_and_segmentation_data_column_description.csv%22%7D"
                                target="_blank"
                                rel="noreferrer"
                            >
                                View dataset in BFF{" "}
                                <Icon
                                    iconName="OpenInNewWindow"
                                    style={{ fontSize: 11, verticalAlign: "middle" }}
                                />
                            </a>
                        </p>
                        <p>
                            In this study on epithelial-to-mesenchymal transition (EMT), the authors
                            generated a large-scale microscopy dataset consisting of 3,538 3D
                            Z-stack datasets across 37 experimental conditions, 8 cell lines, and 9
                            antibody stainings. BioFile Finder (BFF) was used to organize and
                            explore this complex dataset without relying on a fixed folder
                            hierarchy. Instead, BFF enabled dynamic filtering, grouping, and
                            navigation based on metadata, allowing users to analyze the data across
                            multiple dimensions (e.g., comparing stainings across cell lines)
                            without duplicating files. This approach improved collaboration between
                            experimental and computational researchers, supported parallel analysis
                            workflows, and reduced friction in large-scale data exploration.
                            Additionally, BFF was used to share the dataset publicly, enabling
                            readers to directly access figure-associated data, explore full 3D
                            timelapse datasets in the browser, and interact with the dataset using
                            the same flexible metadata-driven framework.
                        </p>
                        <h4>Key takeaways:</h4>
                        <blockquote>
                            <p>
                                &ldquo;Every organizational choice comes at the cost of another. In
                                other words, every choice is a bad choice.&rdquo; &mdash; Antoine
                                Borensztejn, <i>author</i>
                            </p>
                            <p>
                                &ldquo;BioFile Finder (BFF) allowed us to break away from this
                                constraint entirely.&rdquo; &mdash; Antoine Borensztejn,{" "}
                                <i>author</i>
                            </p>
                            <p>
                                &ldquo;We believe this approach sets a new standard for FAIR data
                                sharing, and will significantly improve the accessibility,
                                transparency, and reuse of complex biological datasets.&rdquo;
                                &mdash; Antoine Borensztejn, <i>author</i>
                            </p>
                        </blockquote>
                    </>
                ),
            },
        ],
    },

    "real-world-use-cases/example-aibs": {
        title: "The brain science accelerator at Allen Institute",
        intro: "BFF was used in publication by the brain science accelerator at Allen Institute.",
        sections: [
            {
                id: "publication",
                heading: "",
                body: (
                    <>
                        <p>
                            <a
                                href="https://www.sciencedirect.com/science/article/pii/S0092867425005136"
                                target="_blank"
                                rel="noreferrer"
                            >
                                Open publication{" "}
                                <Icon
                                    iconName="OpenInNewWindow"
                                    style={{ fontSize: 11, verticalAlign: "middle" }}
                                />
                            </a>
                            <br />{" "}
                            <a
                                href="https://bff.allencell.org/app?c=Plasmid+ID%3A0.11466848319709355%2CPlasmid+name%3A0.1809718437783833%2CTarget+Cell+Population%3A0.25%2CLABELED+REGION+COARSE%3A0.25%2CLABELED+REGION+FINE%3A0.25%2CLABELED+CELL+POPULATION%3A0.25&group=Enhancer+ID&group=Cargo&group=Delivery+Method&group=Experiment+Type&source=%7B%22name%22%3A%22Enhancer_AAVs%28in%29.csv+%284%2F27%2F2026+1%3A42%3A00+PM%29%22%2C%22type%22%3A%22csv%22%2C%22uri%22%3A%22https%3A%2F%2Fallen-genetic-tools.s3.us-west-2.amazonaws.com%2Fbio_file_finder%2FBFF_collections_csvs%2FEnhancer_AAVs%28in%29.csv%22%7D&sourceMetadata=%7B%22name%22%3A%22BFF_Viral_Description%28in%29.csv+%283%2F16%2F2025+2%3A16%3A05+PM%29%22%2C%22type%22%3A%22csv%22%2C%22uri%22%3A%22s3%3A%2F%2Fallen-genetic-tools%2Fbio_file_finder%2FBFF_collections_csvs%2FBFF_Viral_Description%28in%29.csv%22%7D"
                                target="_blank"
                                rel="noreferrer"
                            >
                                View dataset in BFF{" "}
                                <Icon
                                    iconName="OpenInNewWindow"
                                    style={{ fontSize: 11, verticalAlign: "middle" }}
                                />
                            </a>
                        </p>
                        <p>
                            Yoav Ben-Simon from the Allen Institute for Brain Science describes
                            using BioFile Finder (BFF) as a flexible data management and sharing
                            platform for imaging datasets related to viral vector targeting in the
                            brain. BFF was used to organize datasets in a spreadsheet-like
                            interface, enabling intuitive querying, filtering, and restructuring of
                            data without requiring custom software development. The tool allowed
                            users to quickly create and curate datasets, organize them
                            hierarchically based on relevant features, and visualize grouped image
                            sets with thumbnails. This significantly lowered the barrier to entry
                            for data management and sharing, enabling non-engineers to deploy and
                            share datasets via simple links rather than building dedicated web
                            interfaces. Additionally, BFF facilitated collaboration by allowing
                            teams to interact with shared datasets dynamically and supported reuse
                            across different domains, extending from cell imaging to brain section
                            and genomic data visualization.
                        </p>
                        <h4>Key takeaways:</h4>
                        <blockquote>
                            <p>
                                &ldquo;BioFile Finder is a data management tool&hellip; like a fancy
                                spreadsheet so that you can interact with it in multiple different
                                ways.&rdquo; &mdash; Yoav Ben-Simon, <i>author</i>
                            </p>
                            <p>
                                &ldquo;I can create and curate data sets in two or three clicks of a
                                button.&rdquo;
                            </p>
                            <p>
                                &ldquo;It doesn&apos;t require exchanging of files&mdash;it just
                                requires exchanging of links.&rdquo; &mdash; Yoav Ben-Simon,{" "}
                                <i>author</i>
                            </p>
                            <p>
                                &ldquo;It was really easy for us to repurpose it&hellip; from
                                looking at individual cells to looking at images of brain sections
                                and genomic data.&rdquo; &mdash; Yoav Ben-Simon, <i>author</i>
                            </p>
                        </blockquote>
                    </>
                ),
            },
            {
                id: "video",
                heading: "",
                body: (
                    <p>
                        <a href="#">Link to social&apos;s video</a> (not yet public)
                    </p>
                ),
            },
        ],
    },

    "real-world-use-cases/example-isas": {
        title: "AMBIOM at ISAS",
        intro: "Lorem ipsum dolor sit amet, consectetur adipiscing elit.",
        sections: [
            {
                id: "publication",
                heading: "",
                body: (
                    <>
                        <p>
                            <a href="#">Link to publication</a>
                        </p>
                        <p>Lorem ipsum dolor sit amet, consectetur adipiscing elit.</p>
                    </>
                ),
            },
        ],
    },

    "real-world-use-cases/other-examples": {
        title: "Other examples",
        intro: "",
        sections: [],
    },

    "getting-started/setup-overview": {
        title: "Setup overview",
        intro:
            "BioFile Finder (BFF) works by connecting a metadata table to the files you want to explore. Rather than ingesting image data directly, BFF reads a dataset file (CSV, Parquet, or JSON) containing metadata and file references. Once loaded, BFF turns that dataset into an interactive interface for filtering, grouping, searching, previewing, and sharing files.",
        sections: [
            {
                id: "basic-setup",
                heading: "Basic setup",
                body: (
                    <>
                        <h3>1. Create a dataset file</h3>
                        <p>
                            Prepare a metadata table describing your files. Each row typically
                            represents a file, while columns contain metadata such as:
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
                                Creating a dataset
                            </a>
                            ,{" "}
                            <a href="/user-guide/getting-started/metadata-guidance">
                                Metadata guidance
                            </a>
                        </p>

                        <h3>2. Reference your files</h3>
                        <p>
                            Your dataset must include paths or URLs pointing to the files you want
                            BFF to access. Files can live:
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

                        <h3>3. Load the dataset into BFF</h3>
                        <p>Open BFF and either:</p>
                        <ul>
                            <li>Drag and drop a dataset file</li>
                            <li>Paste a dataset URL</li>
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
                            <li>Metadata file (CSV, Parquet, or JSON).</li>
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
                            to enable readers to explore the dataset and its files via a{" "}
                            <a href="#">shareable BFF link</a>.
                        </p>
                        <p>
                            Note: You can use BFF as a way to circumvent having to publish all files
                            by publishing only the dataset file and instructing readers to request
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
                                    <Icon
                                        iconName="OpenInNewWindow"
                                        style={{ fontSize: 11, verticalAlign: "middle" }}
                                    />
                                </a>
                                .
                            </li>
                            <li>
                                See <a href="#">Dataset examples</a> for examples to follow when
                                creating a dataset.
                            </li>
                        </ul>
                    </>
                ),
            },
        ],
    },

    "getting-started/creating-a-dataset": {
        title: "Creating a dataset",
        intro:
            "BFF works by referencing a spreadsheet you provide, populated by key-value pairs that are the metadata associated with your image files.",
        sections: [
            {
                id: "creating-spreadsheet",
                heading: "Creating a spreadsheet",
                body: (
                    <>
                        <p>
                            A BFF dataset is a tabular file where each row represents a file and
                            each column is a piece of metadata about that file. The format is
                            flexible — any columns beyond the required ones are yours to define
                            based on what matters to your workflow.
                        </p>
                        <ul>
                            <li>
                                <a href="/user-guide/app-information/specifications">
                                    See App information
                                </a>{" "}
                                for detailed info on accepted file types and other limitations.
                            </li>
                            <li>
                                <a href="/user-guide/getting-started/metadata-guidance">
                                    See Metadata guidance
                                </a>{" "}
                                for detailed info on best practices.
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
                        <ul>
                            <li>
                                <a href="#">
                                    Download this example as CSV{" "}
                                    <Icon
                                        iconName="Download"
                                        style={{ fontSize: 11, verticalAlign: "middle" }}
                                    />
                                </a>
                            </li>
                            <li>
                                <a href="/datasets">Browse open-source datasets</a>
                            </li>
                        </ul>
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
                        <p>
                            <a href="#">See dataset examples</a>
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
                                <Icon
                                    iconName="OpenInNewWindow"
                                    style={{ fontSize: 11, verticalAlign: "middle" }}
                                />
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
                                <Icon
                                    iconName="Download"
                                    style={{ fontSize: 11, verticalAlign: "middle" }}
                                />
                            </a>
                        </p>
                        <p>
                            Descriptions for these fields can be found below as an example for{" "}
                            <a href="/user-guide/getting-started/metadata-guidance#column-descriptions">
                                providing metadata field descriptions inside BFF
                            </a>
                            .
                        </p>
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
                                button.
                            </li>
                        </ul>
                        <h3>Example</h3>
                        <div className="ug-scroll-container">
                            <div className="ug-scroll-table">
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
                                            <td>
                                                Summary of the study&apos;s purpose, design, and
                                                scope
                                            </td>
                                            <td></td>
                                        </tr>
                                        <tr>
                                            <td>Authors</td>
                                            <td>List of contributors to the dataset or study</td>
                                            <td></td>
                                        </tr>
                                        <tr>
                                            <td>Organization</td>
                                            <td>
                                                Institution or organization responsible for the
                                                dataset
                                            </td>
                                            <td></td>
                                        </tr>
                                        <tr>
                                            <td>Publication</td>
                                            <td>
                                                Associated publication or DOI describing the dataset
                                            </td>
                                            <td>Open file link</td>
                                        </tr>
                                        <tr>
                                            <td>License</td>
                                            <td>
                                                Usage license governing the dataset (e.g., CC-BY)
                                            </td>
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
                                            <td>
                                                Gene(s) of interest or manipulated in the experiment
                                            </td>
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
                                                Imaging channel identifier or label (e.g., Channel
                                                1, GFP)
                                            </td>
                                            <td></td>
                                        </tr>
                                        <tr>
                                            <td>Channel — Biological Entity</td>
                                            <td>
                                                Biological structure or molecule represented in the
                                                channel
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
                                                Dimensionality of the dataset (e.g., 2D, 3D, time
                                                series)
                                            </td>
                                            <td></td>
                                        </tr>
                                        <tr>
                                            <td>Pixel/Voxel Size / Time resolution</td>
                                            <td>
                                                Spatial or temporal resolution of the imaging data
                                            </td>
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
                                                Unique identifier for a specific dataset within the
                                                study
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
                                                Link to derived or processed data (e.g.,
                                                segmentation, features)
                                            </td>
                                            <td>Open file link</td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>
                        <p>
                            <a href="#">
                                Download this example as CSV{" "}
                                <Icon
                                    iconName="Download"
                                    style={{ fontSize: 11, verticalAlign: "middle" }}
                                />
                            </a>
                        </p>
                    </>
                ),
            },
            {
                id: "alternative-viewers",
                heading: "Alternative viewers or links",
                body: (
                    <p>
                        Use the <code>Type</code> column in your metadata descriptor file and
                        specify <code>Open file link</code> to tell BFF that a column represents a
                        link to open with the &ldquo;Open with&hellip;&rdquo; button.{" "}
                        <a href="/user-guide/getting-started/metadata-guidance#column-descriptions">
                            See the Type description above
                        </a>
                        .
                    </p>
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
            'Information about how files relate to each other or to different pieces of metadata can be provided via an additional file called a "Provenance file". Provenance in BFF can describe relationships between files, between a file and a piece of metadata, and between two pieces of metadata.',
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
                                <Icon
                                    iconName="Download"
                                    style={{ fontSize: 11, verticalAlign: "middle" }}
                                />
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
                                Download example{" "}
                                <Icon
                                    iconName="Download"
                                    style={{ fontSize: 11, verticalAlign: "middle" }}
                                />
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
                                Download example{" "}
                                <Icon
                                    iconName="Download"
                                    style={{ fontSize: 11, verticalAlign: "middle" }}
                                />
                            </a>
                        </p>
                    </>
                ),
            },
        ],
    },

    "other-resources/storage-options": {
        title: "Storage options",
        intro:
            "BioFile Finder is agnostic of the image file location. BFF simply requires that the metadata file is accessible — where accessible is defined as whichever browser it is running inside can reach it.",
        sections: [
            {
                id: "private-cloud",
                heading: "Can I use private cloud data with BFF?",
                body: (
                    <p>
                        Yes! The browser running BFF just has to have access to the files. If your
                        cloud data is hosted on a private AWS S3 bucket for example, you just have
                        to ensure that BFF has{" "}
                        <a href="/user-guide/other-resources/cors">CORS permission enabled</a>.
                    </p>
                ),
            },
            {
                id: "public-cloud",
                heading: "Can I use public cloud data with BFF?",
                body: (
                    <p>
                        Yes! As long as BFF has permission to access that bucket.{" "}
                        <a href="/user-guide/other-resources/cors">See CORS permissions</a>.
                    </p>
                ),
            },
            {
                id: "hard-drive",
                heading: "Can I use data on a hard drive with BFF?",
                body: (
                    <>
                        <p>
                            Yes! The dataset file (the .csv, .json, or .parquet table) BFF ingests
                            can be anywhere. However, when you refresh the page or try to send a
                            link to your dataset you&apos;ll be prompted to re-enter your dataset
                            since the reference to the dataset will have been broken.
                        </p>
                        <p>
                            The images or files that the dataset references can also be on a hard
                            drive. You will only be able to view files on a hard drive in a desktop
                            application (e.g. FIJI) since web-based viewers won&apos;t have access
                            to your local file system. Similarly, if the hard drive isn&apos;t
                            connected to your computer then BFF will only be able to display the
                            metadata for the file — the viewers BFF hands the file off to will be
                            unable to display it since it would be unreachable.
                        </p>
                    </>
                ),
            },
            {
                id: "network-storage",
                heading: "Can I use data on a network attached file system with BFF?",
                body: (
                    <>
                        <p>
                            Yes! The dataset file (the .csv, .json, or .parquet table) BFF ingests
                            can be anywhere. However, when you refresh the page or try to send a
                            link to your dataset you&apos;ll be prompted to re-enter your dataset
                            since the reference to the dataset will have been broken.
                        </p>
                        <p>
                            The images or files that the dataset references can also be in a network
                            attached storage. You will only be able to view files on a network
                            attached storage in a desktop application (e.g. FIJI) since web-based
                            viewers won&apos;t have access to your local file system. Similarly, if
                            the network attached storage isn&apos;t connected to your computer then
                            BFF will only be able to display the metadata for the file — the viewers
                            BFF hands the file off to will be unable to display the file since it
                            would be unreachable.
                        </p>
                    </>
                ),
            },
            {
                id: "cloud-examples",
                heading: "Cloud storage examples",
                body: (
                    <>
                        <p>
                            For information on compatibility with different storage options,{" "}
                            <a href="/user-guide/app-information/supported-viewers">
                                See Supported viewers
                            </a>
                        </p>

                        <h3>Open source image archives (IDR, BIA, SSBD)</h3>
                        <p>
                            A useful way to think about integrating the Image Data Resource (IDR),
                            BioImage Archive (BIA), and SSBD with BFF is that they occupy different
                            layers of the bioimaging data stack, and BFF can sit above them as a
                            unified discovery and navigation interface.
                        </p>
                        <h4>How each resource differs</h4>
                        <ul>
                            <li>
                                <strong>IDR (Image Data Resource)</strong> — Acts as a curated,
                                analysis-rich repository. Contains re-annotated datasets with strong
                                experimental structure (plates, wells, phenotypes, publications).
                                Best suited for exploration of complete biological studies.
                            </li>
                            <li>
                                <strong>BioImage Archive (BIA)</strong> — Acts as a raw data
                                deposition archive. Stores original imaging data from experiments,
                                often before heavy curation. Best suited for long-term storage and
                                reproducibility of raw microscopy data.
                            </li>
                            <li>
                                <strong>SSBD (Systems Science of Biological Dynamics)</strong> —
                                Acts as a modeling and dynamics-oriented repository. Focuses on
                                time-series, quantitative measurements, and computational models.
                                Best suited for quantitative and dynamic systems biology data rather
                                than raw image browsing.
                            </li>
                        </ul>
                        <h4>How BFF can use them together</h4>
                        <p>
                            BFF can sit above all three as a unified metadata and exploration layer:
                        </p>
                        <ul>
                            <li>
                                From <strong>IDR</strong>, BFF can link directly to structured
                                experimental datasets with rich biological context (e.g., plate →
                                well → image relationships already well-defined).
                            </li>
                            <li>
                                From <strong>BioImage Archive</strong>, BFF can expose raw datasets
                                by indexing deposited image files and attaching lightweight
                                metadata.
                            </li>
                            <li>
                                From <strong>SSBD</strong>, BFF can surface derived quantitative
                                datasets alongside images, enabling links between raw imaging and
                                downstream measurements or models.
                            </li>
                        </ul>
                        <p>
                            By sitting on top of these resources, BFF provides a single search and
                            discovery interface across raw (BIA), curated (IDR), and
                            quantitative/model-based (SSBD) datasets — allowing cross-repository
                            linking and normalized navigation from raw images through to derived
                            analysis.
                        </p>

                        <h3>Google Sheets</h3>
                        <p>You can use Google Sheets to publish your dataset publicly as a CSV:</p>
                        <ol>
                            <li>
                                Click <strong>File</strong> in the toolbar
                            </li>
                            <li>
                                Select <strong>Share</strong> then <strong>Publish to web</strong>
                            </li>
                            <li>
                                In the modal that appears, select the sheet you want to publish and
                                select <strong>Comma-separated values</strong>
                            </li>
                            <li>
                                Click <strong>Publish</strong> and copy/paste the link into BFF
                            </li>
                        </ol>
                        <h3>GitHub</h3>
                        <p>
                            In GitHub you can link to the <strong>Raw</strong> version of a file in
                            a repository to share the dataset with anyone that has access to that
                            repository. This also provides implicit dataset versioning, which can be
                            extremely useful for collaboration.
                        </p>
                        <ol>
                            <li>
                                In GitHub, navigate to the file in the repository you want to
                                publish
                            </li>
                            <li>
                                Click the <strong>Raw</strong> button
                            </li>
                            <li>Copy and paste the URL from the browser into BFF</li>
                        </ol>
                        <p>
                            New to GitHub?{" "}
                            <a
                                href="https://docs.github.com/en/get-started/start-your-journey"
                                target="_blank"
                                rel="noreferrer"
                            >
                                See their documentation here{" "}
                                <Icon
                                    iconName="OpenInNewWindow"
                                    style={{ fontSize: 11, verticalAlign: "middle" }}
                                />
                            </a>
                            .
                        </p>
                        <h3>AWS S3</h3>
                        <p>
                            Your organization may have support for this, but here is an example of a
                            cloud storage service compatible with BioFile Finder.{" "}
                            <a href="https://aws.amazon.com/s3/" target="_blank" rel="noreferrer">
                                AWS S3 documentation{" "}
                                <Icon
                                    iconName="OpenInNewWindow"
                                    style={{ fontSize: 11, verticalAlign: "middle" }}
                                />
                            </a>
                            .
                        </p>
                        <p>
                            You will need to make sure the cloud bucket enables BFF and any viewers
                            to have CORS permission.{" "}
                            <a href="/user-guide/other-resources/cors">See Avoiding CORS errors</a>.
                        </p>
                    </>
                ),
            },
        ],
    },

    "other-resources/cors": {
        title: "Avoiding CORS errors",
        intro:
            "You may need to set up CORS permissions on your cloud bucket to enable bff.allencell.org to access your files. The same will be true for any web-based image viewers — for example vole.allencell.org — that you want to use to view your data.",
        sections: [
            {
                id: "cors-setup",
                heading: "Setting up CORS permissions",
                body: (
                    <>
                        <p>
                            CORS (Cross-Origin Resource Sharing) permissions tell your cloud storage
                            bucket which web origins are allowed to read its files. Without this,
                            browsers block BFF and web-based viewers from accessing your data.
                        </p>
                        <p>
                            Example for AWS S3:{" "}
                            <a
                                href="https://docs.aws.amazon.com/AmazonS3/latest/userguide/ManageCorsUsing.html"
                                target="_blank"
                                rel="noreferrer"
                            >
                                AWS CORS documentation{" "}
                                <Icon
                                    iconName="OpenInNewWindow"
                                    style={{ fontSize: 11, verticalAlign: "middle" }}
                                />
                            </a>
                            .
                        </p>
                    </>
                ),
            },
        ],
    },
};
