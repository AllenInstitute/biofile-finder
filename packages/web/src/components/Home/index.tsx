import classNames from "classnames";
import { DefaultButton } from "@fluentui/react";
import * as React from "react";
import { Link } from "react-router-dom";
import Banner from "./Banner";
import Features from "./Features";
import styles from "./Home.module.css";

// Placeholder for the splash page
export default function Home() {
    const options = [
        {
            header: "YOUR datasets",
            body: `Load a CSV, Parquet or JSON (data source)
            that includes your dataset location to get started.`,
            action: (
                <DefaultButton
                    className={classNames(styles.button)}
                    styles={{
                        label: { "font-size": "14px", "font-weight": "400" },
                        icon: { "font-size": "14px", "font-weight": "500" },
                    }}
                    ariaLabel="Upload file"
                    iconProps={{ iconName: "Upload" }}
                    title="Upload file"
                    text="UPLOAD FILE"
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
                            label: { "font-size": "14px", "font-weight": "400" },
                            icon: { "font-size": "14px", "font-weight": "500" },
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
        <>
            <div className={styles.root}>
                <Banner />
                <div className={styles.content}>
                    <div className={styles.header}>
                        Discover features to improve efficiency in dataset curation
                    </div>
                    <Features />
                    <hr></hr>
                    <div className={styles.optionsContainer}>
                        <div className={styles.header}>What would you like to access today?</div>
                        <div className={styles.options}>
                            {options.map((option, index) => {
                                return (
                                    <div className={styles.option} key={`option_${index}`}>
                                        <div className={styles.optionHeader}>{option.header}</div>
                                        <div className={styles.optionBody}>{option.body}</div>
                                        {option.action}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}
