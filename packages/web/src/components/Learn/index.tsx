import { Icon, Stack } from "@fluentui/react";
import classNames from "classnames";
import * as React from "react";
import { Link } from "react-router-dom";

import LearnDiagramBFF from "../../../assets/learn-diagram-bff.png";
import LearnDiagramCSV from "../../../assets/learn-diagram-csv.png";
import LearnDiagramViewer from "../../../assets/learn-diagram-viewer.png";
import Modal from "../../../../core/components/Modal";

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
                <p>
                    Explore the data without any coding through the standardized metadata, using
                    filters and hierarchies of folders to search for the data needed to answer a
                    specific question. Example...
                </p>
                <Stack wrap horizontal tokens={{ childrenGap: 5 }}>
                    <Stack.Item basis={0} grow={1} shrink={1}>
                        <h3>Find.</h3>
                        <p>
                            Find all images corresponding to a list of criteria provided by
                            annotation and tags.
                        </p>
                    </Stack.Item>
                    <Stack.Item basis={0} grow={1} shrink={1}>
                        <h3>View.</h3>
                        <p>
                            Visualize each file before uploading them ensuring you extracted the
                            right data for your research.
                        </p>
                    </Stack.Item>
                    <Stack.Item basis={0} grow={1} shrink={1}>
                        <h3>Share.</h3>
                        <p>
                            Provide the URL address to your collaborator in just one click for
                            analysis and further exploration of your exact query.
                        </p>
                    </Stack.Item>
                    <Stack.Item basis={0} grow={1} shrink={1}>
                        <h3>Publish.</h3>
                        <p>
                            By storing the .csv file in a public cloud storage, you can include the
                            URL address in your publication for others to access your data in just
                            one click.
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
                    can be shared with others. The URL contains the query that can be shared with
                    others to view the same data and metadata that the user is currently looking at.
                    The receiver of the URL will need access to the datasource (.csv).
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
                    Currently, all you need to get started is a .csv file containing links to your
                    data. Add metadata to your .csv to make using BioFile Finder even more powerful!
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
                    No! The data source file you upload is not stored by BioFile Finder, nor does
                    any of the data you query get sent to us.
                </p>
                <h3>Can BioFile Finder store my data to make it public?</h3>
                <p>
                    Sort of. We are working on a way to allow users to store their .csv with us to
                    make it public. In the meantime, email us at
                    <a
                        className={styles.link}
                        href="mailto:aics_software_support@alleninstitute.org"
                    >
                        &nbsp;aics_software_support@alleninstitute.org
                    </a>
                    to request your data be included with our own collection of open-source
                    datasets. Please note, your image data would need to be stored in a public
                    location like
                    <a
                        className={styles.link}
                        href="https://idr.openmicroscopy.org/"
                        target="_blank"
                        rel="noreferrer"
                    >
                        &nbsp;Image Data Registry&nbsp;
                    </a>
                    or AWS.
                </p>
                <p className={styles.sectionFooter}>
                    Check out our{" "}
                    <Link className={styles.link} to="/datasets">
                        Open-source datasets
                    </Link>{" "}
                    for inspiration and examples of datasets.
                </p>
            </div>
            <div className={styles.section}>
                <h2>Have questions, ideas, requests, or want help getting started?</h2>
                <p>
                    Please reach out to us at
                    <a
                        className={styles.link}
                        href="mailto:aics_software_support@alleninstitute.org"
                    >
                        &nbsp;aics_software_support@alleninstitute.org
                    </a>
                    .
                </p>
            </div>
            <Modal />
        </div>
    );
}
