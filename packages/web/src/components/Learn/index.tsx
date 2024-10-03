import { Icon, Link, Stack } from "@fluentui/react";
import classNames from "classnames";
import * as React from "react";

import LearnDiagramBFF from "../../../assets/learn-diagram-bff.png";
import LearnDiagramCSV from "../../../assets/learn-diagram-csv.png";
import LearnDiagramViewer from "../../../assets/learn-diagram-viewer.png";

import styles from "./Learn.module.css";

// Public-facing learning/about page
export default function Learn() {
    return (
        <div className={styles.root}>
            <div className={styles.banner}>
                <div className={styles.bannerBlur}>
                    <div className={classNames(styles.section, styles.titleContainer)}>
                        <h1>Curate your data your way</h1>
                        <p>
                            BioFile Finder helps users effortlessly interact with, extrapolate, and
                            share data.
                        </p>
                    </div>
                </div>
            </div>
            <div className={styles.section}>
                <h2>Why BioFile Finder?</h2>
                <Stack wrap horizontal tokens={{ childrenGap: 5 }}>
                    <Stack.Item basis={0} grow={1} shrink={1}>
                        <h3>Group, filter, & sort data through rich metadata search.</h3>
                        <p>
                            Use quick & efficient query builder tools to build a customized view
                            into users data
                        </p>
                    </Stack.Item>
                    <Stack.Item basis={0} grow={1} shrink={1}>
                        <h3>Directly view images.</h3>
                        <p>Quickly view images using various supported image viewers</p>
                    </Stack.Item>
                    <Stack.Item basis={0} grow={1} shrink={1}>
                        <h3>Share data.</h3>
                        <p>
                            Users can simply copy & paste the URL to share the same query the are
                            currently looking at, the receiver of the URL will need access to the
                            datasource (.csv).
                        </p>
                    </Stack.Item>
                    <Stack.Item basis={0} grow={1} shrink={1}>
                        <h3>Collaborate programmatically.</h3>
                        <p>
                            Share the exact query presented in BioFile Finder as a snippet of code
                            which programmatic users can use to access the same data.
                        </p>
                    </Stack.Item>
                </Stack>
            </div>
            <div className={styles.section}>
                <h2>How does it work?</h2>
                <p>
                    BioFile Finder is a web application that allows users to interact with their
                    data in a more efficient and effective way. Users upload a .csv file with
                    metadata and a link to their data. The .csv file is used to create a query that
                    can be shared with others. The query is a URL that can be shared with others to
                    view the same data and metadata that the user is currently looking at. The
                    receiver of the URL will need access to the datasource (.csv).
                </p>
                <Stack wrap horizontal className={styles.iconStack} tokens={{ childrenGap: 5 }}>
                    <Stack.Item className={styles.column} basis={1} grow={1} shrink={1}>
                        <img alt="Example CSV" height={135} src={LearnDiagramCSV} />
                        <p className={styles.imageTitle}>.csv File</p>
                    </Stack.Item>
                    <Stack.Item className={styles.iconContainer} basis={1} grow={0} shrink={1}>
                        <Icon iconName="Forward" />
                    </Stack.Item>
                    <Stack.Item className={styles.column} basis={1} grow={1} shrink={1}>
                        <img
                            alt="Example BioFile Finder Usage"
                            height={150}
                            src={LearnDiagramBFF}
                        />
                        <p className={styles.imageTitle}>Biofile Finder</p>
                    </Stack.Item>
                    <Stack.Item className={styles.iconContainer} basis={1} grow={0} shrink={1}>
                        <Icon iconName="Forward" />
                    </Stack.Item>
                    <Stack.Item className={styles.column} basis={1} grow={1} shrink={1}>
                        <img alt="Example Image Viewer" height={150} src={LearnDiagramViewer} />
                        <p className={styles.imageTitle}>Image Viewer</p>
                    </Stack.Item>
                </Stack>
            </div>
            <div className={styles.section}>
                <h2>FAQ</h2>
                <h3>Is my data a good fit?</h3>
                <p>
                    BioFile Finder is designed to be flexible and work with a wide range of data.
                    Currently, all you need to get started is a .csv file with metadata and a link
                    to your data. The .csv just has to have a first row with the column names one of
                    which has to be &quot;File Path&quot; which is the column you will provide
                    unique links to your data in.
                </p>
                <h3>Does my data have to be public?</h3>
                <p>
                    No! You can use BioFile Finder with private data. Just make sure to provide a
                    link to your data that is accessible to BioFile Finder. Similarly, whoever you
                    share your query with will need to have access to the data you have linked to or
                    at the very least the .csv file you have used to create the query.
                </p>
                <h3>Is BioFile Finder storing my image data or metadata?</h3>
                <p>
                    No! The data source file you upload is not stored by BioFile Finder nor does any
                    of the data you query get sent to us.
                </p>
                <h3>Can BioFile Finder store my data to make it public?</h3>
                <p>
                    Sort of. We, at the Allen Institute for Cell Science, are working on a way to
                    allow users to store their .csv with us to make it public. In the meantime, if
                    you send a request to us at
                    <a
                        className={styles.link}
                        href="https://github.com/AllenInstitute/biofile-finder/issues"
                        target="_blank"
                        rel="noreferrer"
                    >
                        &nbsp;this link
                    </a>
                    , we can see about including your data in our open-source datasets ahead of
                    time. Please note, your image data would need to be stored in a public location
                    like
                    <a
                        className={styles.link}
                        href="https://idr.openmicroscopy.org/"
                        target="_blank"
                        rel="noreferrer"
                    >
                        &nbsp;on Image Data Registry&nbsp;
                    </a>
                    or AWS for example.
                </p>
                <p className={styles.sectionFooter}>
                    Check out our{" "}
                    <Link className={styles.link} to="datasets">
                        Open-source datasets
                    </Link>{" "}
                    for inspiration and examples of datasets.
                </p>
            </div>
            <div className={styles.section}>
                <h2>Have questions, ideas, requests, or want help getting started?</h2>
                <p>
                    Please reach out to us on
                    <a
                        className={styles.link}
                        href="https://github.com/AllenInstitute/biofile-finder/issues"
                        target="_blank"
                        rel="noreferrer"
                    >
                        &nbsp;our GitHub page here
                    </a>
                    .
                </p>
            </div>
        </div>
    );
}
