import { DefaultButton } from "@fluentui/react";
import classNames from "classnames";
import * as React from "react";
import { Link, useNavigate } from "react-router-dom";

import Banner from "./Banner";
import Features from "./Features";
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
                <Modal />
            </div>
        </div>
    );
}
