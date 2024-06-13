import { DefaultButton } from "@fluentui/react";
import classNames from "classnames";
import * as React from "react";
import { Link, useNavigate } from "react-router-dom";

import Features from "./Features";
import { APPLICATION_NAME } from "../../constants";
import Modal from "../../../../core/components/Modal";

import styles from "./Home.module.css";

// Public-facing splash page
export default function Home() {
    const navigate = useNavigate();

    const options = [
        {
            header: "YOUR datasets",
            body: `Load a CSV, Parquet or JSON (data source)
            that includes your dataset location to get started.`,
            action: (
                <DefaultButton
                    className={classNames(styles.button)}
                    styles={{
                        label: styles.buttonLabel,
                        icon: styles.buttonIcon,
                    }}
                    ariaLabel="Get started"
                    onClick={() => navigate("/app")}
                    title="Get started"
                    text="GET STARTED"
                />
            ),
        },
        {
            header: "OUR open source datasets and additional contributors",
            body: `Use BioFile Finder to view and access datasets from
            the Allen Institute for Cell Science and other contributors.`,
            action: (
                <Link to={"datasets"}>
                    <DefaultButton
                        className={classNames(styles.button)}
                        styles={{
                            label: styles.buttonLabel,
                            icon: styles.buttonIcon,
                        }}
                        ariaLabel="View datasets"
                        iconProps={{ iconName: "BulletedList" }}
                        title="View datasets"
                        text="VIEW DATASETS"
                    />
                </Link>
            ),
        },
    ];
    return (
        <div className={styles.root}>
            <div className={styles.banner}>
                <div className={classNames(styles.section, styles.bannerContent)}>
                    <div className={styles.bannerContentText}>
                        <h1 className={styles.bannerHeader}> Welcome to {APPLICATION_NAME}</h1>
                        <div className={styles.bannerBody}>
                            The {APPLICATION_NAME} is an open-use web application created for easy
                            access, collaboration, and sharing of datasets through rich metadata
                            search, filter, sort, and direct viewing in common industry applications
                            or in our web-based 3D Volume Viewer.
                        </div>
                    </div>
                    <div className={styles.videoWalkthrough}>
                        <div className={styles.videoWalkthroughFake}>
                            Video placeholder: Demo showing how to use the app via interactive
                            walkthrough
                        </div>
                    </div>
                </div>
            </div>
            <div className={styles.section}>
                <h2 className={styles.header}>
                    Discover features to improve efficiency in dataset curation
                </h2>
                <Features />
            </div>
            <div className={styles.section}>
                <h2 className={styles.header}>What data would you like to explore?</h2>
                <div className={styles.options}>
                    {options.map((option, index) => (
                        <div className={styles.option} key={`option_${index}`}>
                            <div className={styles.optionHeader}>{option.header}</div>
                            <div className={styles.optionBody}>{option.body}</div>
                            {option.action}
                        </div>
                    ))}
                </div>
                <Modal />
            </div>
        </div>
    );
}
