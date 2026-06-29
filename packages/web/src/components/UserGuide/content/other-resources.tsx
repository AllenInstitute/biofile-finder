import { Icon } from "@fluentui/react";
import * as React from "react";

import { GroupSlug, Page, PageSlug } from "./types";

export const OTHER_RESOURCES_CONTENT: Page[] = [
    {
        slug: PageSlug.StorageOptions,
        title: "Storage options",
        intro:
            "Whether cloud, local, or network storage, BioFile Finder (BFF) is agnostic of where your files live. The only requirement is that the metadata file is accessible to the browser running BFF.",
        sections: [
            {
                heading: "Cloud storage",
                body: (
                    <>
                        <h3>Public vs private</h3>
                        <p>
                            BFF works with both public and private data by using the access that
                            already exists. Whether access is granted through a private network,
                            VPN, cloud IAM roles, or storage credentials, BFF operates within those
                            permissions rather than introducing a separate authentication or
                            authorization layer. The only requirement is that{" "}
                            <a
                                href={`/user-guide/${GroupSlug.OtherResources}/${PageSlug.AvoidingCORSErrors}`}
                            >
                                CORS permissions
                            </a>{" "}
                            are configured on the bucket so the browser can access the files.
                        </p>
                    </>
                ),
            },
            {
                heading: "Cloud storage examples",
                body: (
                    <>
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
                                Choose <strong>Share</strong> then <strong>Publish to web</strong>
                            </li>
                            <li>
                                Select the sheet you want to publish and select{" "}
                                <strong>Comma-separated values</strong>
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
                            very useful for collaboration.
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
                                See GitHub documentation{" "}
                                <Icon iconName="OpenInNewWindow" className="ug-icon-sm" />
                            </a>
                        </p>
                        <h3>AWS S3</h3>
                        <p>
                            Your organization may provide support for choosing the best option, but
                            AWS S3 is a commonly used cloud storage service compatible with BFF that
                            you may consider.{" "}
                            <a href="https://aws.amazon.com/s3/" target="_blank" rel="noreferrer">
                                See AWS S3 documentation{" "}
                                <Icon iconName="OpenInNewWindow" className="ug-icon-sm" />
                            </a>
                            .
                        </p>
                    </>
                ),
            },
            {
                heading: "Local and network storage",
                body: (
                    <>
                        <p>
                            BFF can load a metadata file from a local hard drive or network-attached
                            storage. However, because BFF runs in the browser, local paths are not
                            persisted — if you refresh the page or share the link, you will be
                            prompted to reload the metadata file.
                        </p>
                        <p>
                            Files referenced in the dataset can also live locally or on a network
                            drive, but they can only be opened in desktop applications (e.g. FIJI).
                            Web-based viewers do not have access to the local file system. If the
                            drive is disconnected, BFF will still display the metadata but the
                            viewers will be unable to open the files.
                        </p>
                    </>
                ),
            },
        ],
    },

    {
        slug: PageSlug.AvoidingCORSErrors,
        title: "Avoiding CORS errors",
        intro:
            "You may need to set up CORS permissions on your cloud bucket to enable bff.allencell.org to access your files. The same will be true for any web-based image viewers — for example vole.allencell.org — that you want to use to view your data.",
        sections: [
            {
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
                                <Icon iconName="OpenInNewWindow" className="ug-icon-sm" />
                            </a>
                            .
                        </p>
                    </>
                ),
            },
        ],
    },
];
