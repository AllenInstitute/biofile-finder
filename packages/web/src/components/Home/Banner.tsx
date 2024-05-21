import * as React from "react";

import { APPLICATION_NAME } from "../../constants";

import styles from "./Banner.module.css";

// Banner for the splash page
export default function Banner() {
    return (
        <>
            <div className={styles.banner}>
                <div className={styles.bannerContent}>
                    <div className={styles.bannerContentText}>
                        <div className={styles.bannerHeader}> Welcome to {APPLICATION_NAME}</div>
                        <div className={styles.bannerBody}>
                            The {APPLICATION_NAME} is an open-use web application created for easy
                            access, collaboration, and sharing of datasets through rich metadata
                            search, filter, sort, and direct viewing in common industry applications
                            or in our web-based 3D Volume Viewer.
                        </div>
                    </div>
                    <div className={styles.videoWalkthrough}>
                        Video placeholder: Demo showing how to use the app via interactive
                        walkthrough
                    </div>
                </div>
            </div>
        </>
    );
}
