import { Stack } from "@fluentui/react";
import classNames from "classnames";
import * as React from "react";
import { Link } from "react-router-dom";

import Features from "./Features";
import { PrimaryButton } from "../../../../core/components/Buttons";
import Modal from "../../../../core/components/Modal";

import styles from "./Home.module.css";

const STACK_ROW_GAP = 12;
const STACK_COL_GAP_WIDE = 48;
const STACK_COL_GAP_NARROW = 20;

// Public-facing splash page
export default function Home() {
    const options = [
        {
            header: "YOUR datasets",
            body: `Load a CSV, Parquet or JSON (data source)
            that includes your dataset location to get started.`,
            action: (
                <Link to="app">
                    <PrimaryButton
                        className={styles.optionButton}
                        iconName="Checkmark"
                        title="Get started"
                        text="GET STARTED"
                    />
                </Link>
            ),
        },
        {
            header: "OUR open source datasets and additional contributors",
            body: `Use BioFile Finder to view and access datasets from
            the Allen Institute for Cell Science and other contributors.`,
            action: (
                <Link to="datasets">
                    <PrimaryButton
                        className={styles.optionButton}
                        iconName="BulletedList"
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
                    <Stack
                        horizontal
                        wrap
                        styles={{ root: styles.stack }}
                        tokens={{ childrenGap: `${STACK_ROW_GAP} ${STACK_COL_GAP_WIDE}` }}
                    >
                        <Stack.Item grow styles={{ root: styles.stackItem60 }}>
                            <div className={styles.bannerContentText}>
                                <h1 className={styles.bannerHeader}> Welcome to BioFile Finder</h1>
                                <div className={styles.bannerBody}>
                                    The BioFile Finder is an open-use web application created for
                                    easy access, collaboration, and sharing of datasets through rich
                                    metadata search, filter, sort, and direct viewing in common
                                    industry applications or in our web-based 3D Volume Viewer.
                                </div>
                            </div>
                        </Stack.Item>
                        <Stack.Item grow styles={{ root: styles.stackItem30 }}>
                            <div className={styles.videoWalkthrough}>
                                <iframe
                                    src="https://player.vimeo.com/video/974452570?badge=0&amp;autopause=0&amp;player_id=0&amp;app_id=58479"
                                    height="200"
                                    allow="autoplay; fullscreen; picture-in-picture; clipboard-write"
                                    title="BioFile Finder Demo"
                                />
                            </div>
                        </Stack.Item>
                    </Stack>
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
                    <Stack
                        horizontal
                        wrap
                        horizontalAlign="center"
                        styles={{ root: styles.stack }}
                        tokens={{ childrenGap: `${STACK_ROW_GAP} ${STACK_COL_GAP_NARROW}` }}
                    >
                        {options.map((option, index) => (
                            // Mod in classnames to keep items centered together
                            <Stack.Item
                                key={"stackitem_" + index}
                                className={classNames(
                                    index % 2 == 0 ? styles.stackItemRight : styles.stackItemLeft
                                )}
                            >
                                <div className={styles.option} key={`option_${index}`}>
                                    <div className={styles.optionHeader}>{option.header}</div>
                                    <div className={styles.optionBody}>{option.body}</div>
                                    {option.action}
                                </div>
                            </Stack.Item>
                        ))}
                    </Stack>
                </div>
                <Modal />
            </div>
        </div>
    );
}
