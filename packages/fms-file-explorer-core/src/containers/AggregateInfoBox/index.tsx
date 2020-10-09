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
    const [isLoading, setLoading] = React.useState(false);
    const [totalFileSize, setTotalFileSize] = React.useState("0");
    React.useEffect(() => {
        if (totalFilesSelected) {
            setLoading(true);
            const getAggregateInformation = async () => {
                const { size } = await fileService.getAggregateInformation(fileSelection);
                setTotalFileSize(filesize(size));
                setLoading(false);
            };
            getAggregateInformation();
        }
    }, [fileSelection, fileService, totalFilesSelected]);

    if (!totalFilesSelected) {
        return <div />;
    }

    return (
        <div className={styles.container}>
            {isLoading ? (
                <Spinner
                    className={styles.spinner}
                    size={SpinnerSize.small}
                    data-testid="aggregate-info-box-spinner"
                />
            ) : (
                <div>
                    <div className={styles.column}>
                        <div>{totalFilesSelected}</div>
                        <h6 className={styles.label}>
                            Total Files <br /> Selected
                        </h6>
                    </div>
                    <div className={styles.column}>
                        <div>{totalFileSize}</div>
                        <h6 className={styles.label}>
                            Total File <br /> Size
                        </h6>
                    </div>
                </div>
            )}
        </div>
    );
}
