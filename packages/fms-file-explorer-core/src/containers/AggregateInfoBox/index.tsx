import filesize from "filesize";
import { Spinner, SpinnerSize } from "office-ui-fabric-react";
import * as React from "react";
import { useSelector } from "react-redux";

import { interaction, selection } from "../../state";

const styles = require("./AggregateInfoBox.module.css");

/**
 * An information box display for displaying aggregate information about the
 * files selected
 */
export default function AggregateInfoBox() {
    const fileService = useSelector(interaction.selectors.getFileService);
    const fileSelection = useSelector(selection.selectors.getFileSelection);
    const totalFilesSelected = fileSelection.count();
    const [uniqueFilesSelected, setUniqueFilesSelected] = React.useState(totalFilesSelected);
    const [totalFileSize, setTotalFileSize] = React.useState("0");
    const [error, setError] = React.useState<string>();
    const [isLoading, setLoading] = React.useState(false);

    React.useEffect(() => {
        if (totalFilesSelected) {
            setLoading(true);
            const getAggregateInformation = async () => {
                try {
                    const { count, size } = await fileService.getAggregateInformation(
                        fileSelection
                    );
                    setTotalFileSize(filesize(size));
                    setUniqueFilesSelected(count);
                    setError(undefined);
                } catch (requestError) {
                    setError(
                        `Whoops! Couldn't get aggregate information for some reason. ${requestError}`
                    );
                }
                setLoading(false);
            };
            getAggregateInformation();
        }
    }, [fileSelection, fileService, totalFilesSelected, uniqueFilesSelected]);

    if (!totalFilesSelected) {
        return null;
    }
    if (isLoading) {
        return (
            <div className={styles.container}>
                <Spinner
                    className={styles.spinner}
                    size={SpinnerSize.small}
                    data-testid="aggregate-info-box-spinner"
                />
            </div>
        );
    }
    if (error) {
        return (
            <div className={styles.container}>
                <div className={styles.errorMessage}>{error}</div>
            </div>
        );
    }
    return (
        <div className={styles.container}>
            <div className={styles.row}>
                <div className={styles.column}>
                    <div>{totalFilesSelected}</div>
                    <h6 className={styles.label}>
                        Total Files <br /> Selected
                    </h6>
                </div>
                <div className={styles.column}>
                    <div>{uniqueFilesSelected}</div>
                    <h6 className={styles.label}>
                        Unique Files <br /> Selected
                    </h6>
                </div>
                <div className={styles.column}>
                    <div>{totalFileSize}</div>
                    <h6 className={styles.label}>
                        Total File <br /> Size
                    </h6>
                </div>
            </div>
        </div>
    );
}
