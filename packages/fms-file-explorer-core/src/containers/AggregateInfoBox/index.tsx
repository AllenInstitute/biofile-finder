import filesize from "filesize";
import { Spinner, SpinnerSize } from "office-ui-fabric-react";
import * as React from "react";
import { useSelector } from "react-redux";

import FileSelection from "../../entity/FileSelection";
import { interaction, selection } from "../../state";

const styles = require("./AggregateInfoBox.module.css");

interface AggregateData {
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
    const [isLoading, setLoading] = React.useState(false);

    React.useEffect(() => {
        // This tracking variable allows us to avoid a call to setAggregateData (which triggers a re-render) if the
        // effect is rerun prior to a successful network response. This could be the case if a user makes a file
        // selection then quickly makes a new selection.
        let ignoreResponse = false;

        if (totalFilesSelected) {
            setLoading(true);
            const getAggregateInformation = async () => {
                try {
                    const { count, size } = await fileService.getAggregateInformation(
                        fileSelection
                    );
                    if (!ignoreResponse) {
                        setAggregateData({ count, size: filesize(size) });
                        setLoading(false);
                        setError(undefined);
                    }
                } catch (requestError) {
                    if (!ignoreResponse) {
                        setError(
                            `Whoops! Couldn't get aggregate information for some reason. ${requestError}`
                        );
                    }
                }
            };
            getAggregateInformation();
        }
        return function cleanup() {
            ignoreResponse = true;
        };
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
