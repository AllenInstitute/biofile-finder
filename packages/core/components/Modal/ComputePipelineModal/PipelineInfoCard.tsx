import * as React from "react";

import { Pipeline } from "../../../entity/ComputePipeline";

import styles from "./ComputePipelineModal.module.css";

interface PipelineInfoCardProps {
    pipeline: Pipeline;
}

export default function PipelineInfoCard({ pipeline }: PipelineInfoCardProps) {
    return (
        <div className={styles.infoCard}>
            <div className={styles.infoCardDesc}>{pipeline.description}</div>
            <hr className={styles.infoCardDivider} />
            <div className={styles.infoTable}>
                <div className={styles.infoRow}>
                    <span className={styles.infoRowLabel}>Accepted formats</span>
                    <span className={styles.infoRowValue}>
                        {pipeline.acceptedExtensions.map((e) => e.toUpperCase()).join(", ")}
                    </span>
                </div>
                <div className={styles.infoRow}>
                    <span className={styles.infoRowLabel}>Run locations</span>
                    <span className={styles.infoRowValue}>{pipeline.clusters.join(", ")}</span>
                </div>
                <div className={styles.infoRow}>
                    <span className={styles.infoRowLabel}>Restrictions</span>
                    <span className={styles.infoRowValue}>{pipeline.restrictions ?? "None"}</span>
                </div>
            </div>
        </div>
    );
}
