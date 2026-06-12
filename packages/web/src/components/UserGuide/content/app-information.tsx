import { Icon } from "@fluentui/react";
import * as React from "react";

import type { PageContent } from "./types";

export const APP_INFORMATION_CONTENT: Record<string, PageContent> = {
    "app-information/specifications": {
        title: "Specifications",
        intro: "Technical specifications for BioFile Finder (BFF).",
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
                            GitHub <Icon iconName="OpenInNewWindow" className="ug-icon-sm" />
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
            "BioFile Finder (BFF) links out to a variety of image viewers. Use the information below to choose the right one for your work.",
        sections: [
            {
                id: "decision-guide",
                heading: "Decision guide",
                body: (
                    <>
                        <p>
                            File format will heavily limit viewer options, but when multiple options
                            are feasible, the following information may help guide your decision.
                        </p>
                        <ul>
                            <li>&ldquo;I need to measure/analyze my images&rdquo; → FIJI</li>
                            <li>&ldquo;I need a beautiful 3D render&rdquo; → AGAVE</li>
                            <li>
                                &ldquo;I need to explore a huge dataset in the cloud&rdquo; →
                                Neuroglancer or Vol-E
                            </li>
                            <li>
                                &ldquo;I need to view a simulation over time&rdquo; → Simularium
                            </li>
                            <li>
                                &ldquo;I need to check my OME-Zarr is valid&rdquo; → OME NGFF
                                Validator
                            </li>
                            <li>&ldquo;I have DICOM/medical volumes&rdquo; → VolView</li>
                            <li>
                                &ldquo;I just want to glance at a simple file quickly&rdquo; →
                                Browser / OS preview
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
                        <div
                            className="ug-scroll-container"
                            tabIndex={0}
                            aria-label="Scrollable viewer comparison table"
                        >
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
                                            <td>Type</td>
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
                                            <td>Platform</td>
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
                                            <td>Installation required</td>
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
                                            <td>Cost</td>
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
                                            <td>Primary use case</td>
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
                                            <td>Supported formats</td>
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
                                            <td>3D volume rendering</td>
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
                                            <td>Multi-channel support</td>
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
                                            <td>Time series / 4D</td>
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
                                            <td>Large data / streaming</td>
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
                                            <td>Cloud / remote data</td>
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
                                            <td>Collaborative / sharing</td>
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
                                            <td>Best for</td>
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
                                            <td>Limitations</td>
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
};
