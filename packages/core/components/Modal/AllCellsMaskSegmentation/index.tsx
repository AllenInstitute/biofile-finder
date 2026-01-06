import { TextField } from "@fluentui/react";
import * as React from "react";
import { useDispatch } from "react-redux";

import { ModalProps } from "..";
import BaseModal from "../BaseModal";
import { PrimaryButton, SecondaryButton } from "../../Buttons";
import { interaction, selection } from "../../../state";

import styles from "./AllCellsMaskSegmentation.module.css";

/**
 * Fixed PoC manifest CSV.
 * Loaded as a NEW QUERY (no modification of existing queries).
 */
const MANIFEST_CSV_URL =
    "https://biofile-finder-datasets.s3.us-west-2.amazonaws.com/Variance+Paper+Dataset.csv";

type UIOpts = {
    scene: string;
    channel: string;
};

export default function AllCellsMaskSegmentation({ onDismiss }: ModalProps) {
    const dispatch = useDispatch();

    const [opts, setOpts] = React.useState<UIOpts>({
        scene: "1",
        channel: "0",
    });

    const [submitted, setSubmitted] = React.useState(false);

    const onSubmit = () => {
        // PoC: no backend request yet
        setSubmitted(true);

        dispatch(
            interaction.actions.processSuccess(
                "acmSubmitSuccess",
                "All Cells Mask job submitted successfully."
            )
        );
    };

    const onOpenResults = () => {
        dispatch(
            selection.actions.addQuery({
                name: "All Cells Mask Results",
                parts: {
                    sources: [
                        {
                            name: "ALL-CELLS-MASK-2",
                            type: "csv",
                            uri: MANIFEST_CSV_URL,
                        },
                    ],
                },
                loading: true,
            })
        );
        onDismiss();
    };

    // ----- BODY -----
    const body = (
        <div className={styles.shell}>
            <div className={styles.columns}>
                {/* LEFT COLUMN */}
                <div className={styles.leftCol}>
                    {!submitted && (
                        <>
                            <div className={styles.section}>
                                <div className={styles.label}>Scene</div>
                                <TextField
                                    value={opts.scene}
                                    type="number"
                                    onChange={(_, v) =>
                                        setOpts((o) => ({
                                            ...o,
                                            scene: (v ?? "").replace(/[^\d]/g, ""),
                                        }))
                                    }
                                    borderless
                                />
                            </div>

                            <div className={styles.section}>
                                <div className={styles.label}>Channel</div>
                                <TextField
                                    value={opts.channel}
                                    type="number"
                                    onChange={(_, v) =>
                                        setOpts((o) => ({
                                            ...o,
                                            channel: (v ?? "").replace(/[^\d]/g, ""),
                                        }))
                                    }
                                    borderless
                                />
                            </div>
                        </>
                    )}
                </div>

                {/* RIGHT COLUMN */}
                <div className={styles.rightCol}>
                    {!submitted ? (
                        <div className={styles.instructions}>
                            <p>This feature is in an early proof-of-concept stage.</p>
                            <p>
                                The All Cells Mask pipeline generates a manifest CSV as files are
                                processed.
                            </p>
                            <p>
                                Depending on file size and count, processing may take over an hour.
                            </p>
                            <p>
                                Please contact <b>support_aics_software</b> with feedback.
                            </p>
                        </div>
                    ) : (
                        <div className={styles.success}>
                            <h3>Submission successful</h3>
                            <p>
                                Results will be available in a new query once processing completes.
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );

    // ----- FOOTER -----
    const footer = (
        <div className={styles.footerButtons}>
            {!submitted ? (
                <>
                    <SecondaryButton onClick={onDismiss} text="CANCEL" />
                    <PrimaryButton onClick={onSubmit} text="SUBMIT" />
                </>
            ) : (
                <>
                    <SecondaryButton onClick={onDismiss} text="CLOSE" />
                    <PrimaryButton onClick={onOpenResults} text="OPEN RESULTS IN BFF" />
                </>
            )}
        </div>
    );

    return (
        <BaseModal
            title="Compute All Cells Mask"
            body={body}
            footer={footer}
            isStatic
            onDismiss={onDismiss}
        />
    );
}
