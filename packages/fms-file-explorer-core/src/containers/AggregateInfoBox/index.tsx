import filesize from "filesize";
import { Spinner, SpinnerSize } from "office-ui-fabric-react";
import * as React from "react";
import { useSelector } from "react-redux";

import FileSelection from "../../entity/FileSelection";
import { interaction, selection } from "../../state";

const styles = require("./AggregateInfoBox.module.css");

interface AggregateData {
    id: number;
    count: number;
    size: string;
}

/**
 * An information box display for displaying aggregate information about the
 * files selected
 */
export default function AggregateInfoBox() {
    const fileService = useSelector(interaction.selectors.getFileService);
    const fileSelection = useSelector(
        selection.selectors.getFileSelection,
        FileSelection.selectionsAreEqual
    );
    const totalFilesSelected = fileSelection.count();
    const [error, setError] = React.useState<string>();
    const [aggregateData, setAggregateData] = React.useState<AggregateData>();
    // Due to the async nature of requesting aggregate info, we can't rely on setting a loading hook
    // without the possibility of it getting overwritten by another request. Assigning an "id" to track
    // if the async request is the one we actually want seems best for now.
    const isLoading = !aggregateData || aggregateData.id !== totalFilesSelected;

    React.useEffect(() => {
        if (totalFilesSelected) {
            const getAggregateInformation = async () => {
                try {
                    const { count, size } = await fileService.getAggregateInformation(
                        fileSelection
                    );
                    setAggregateData({ id: totalFilesSelected, count, size: filesize(size) });
                    setError(undefined);
                } catch (requestError) {
                    setError(
                        `Whoops! Couldn't get aggregate information for some reason. ${requestError}`
                    );
                }
            };
            getAggregateInformation();
        }
    }, [fileSelection, fileService, totalFilesSelected]);

    if (!totalFilesSelected) {
        return null;
    }
    if (error) {
        return (
            <div className={styles.container}>
                <div className={styles.errorMessage}>{error}</div>
            </div>
        );
    }
    const loadingSpinner = (
        <Spinner size={SpinnerSize.small} data-testid="aggregate-info-box-spinner" />
    );
    return (
        <div className={styles.container}>
            <div className={styles.row}>
                <div className={styles.column}>
                    <div className={styles.columnData}>{totalFilesSelected}</div>
                    <h6 className={styles.label}>
                        Total Files <br /> Selected
                    </h6>
                </div>
                <div className={styles.column}>
                    <div className={styles.columnData}>
                        {!isLoading && aggregateData ? (
                            aggregateData.count
                        ) : (
                            <Spinner
                                size={SpinnerSize.small}
                                data-testid="aggregate-info-box-spinner"
                            />
                        )}
                    </div>
                    <h6 className={styles.label}>
                        Unique Files <br /> Selected
                    </h6>
                </div>
                <div className={styles.column}>
                    <div className={styles.columnData}>
                        {!isLoading && aggregateData ? (
                            aggregateData.size
                        ) : (
                            <Spinner
                                size={SpinnerSize.small}
                                data-testid="aggregate-info-box-spinner"
                            />
                        )}
                    </div>
                    <h6 className={styles.label}>
                        Total File <br /> Size
                    </h6>
                </div>
            </div>
        </div>
    );
}
