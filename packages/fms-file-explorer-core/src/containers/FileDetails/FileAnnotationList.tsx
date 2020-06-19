import { orderBy } from "lodash";
import * as React from "react";

import Cell from "../../components/FileRow/Cell";
import FileDetail from "../../entity/FileDetail";

const styles = require("./FileAnnotationList.module.css");

interface FileAnnotationListProps {
    fileDetails?: FileDetail;
    isLoading: boolean;
}

/**
 * Component responsible for rendering the metadata pertaining to a file inside the file
 * details pane on right hand side of the application.
 */
export default function FileAnnotationList(props: FileAnnotationListProps) {
    const { fileDetails, isLoading } = props;

    if (isLoading) {
        return <div className={styles.emptyDetailList}>Loading...</div>;
    }

    if (!fileDetails) {
        return <div className={styles.emptyDetailList}>No files currently selected</div>;
    }
    const createAnnotationRow = (name: string, value: string) => (
        <div key={name}>
            <Cell className={styles.rowKey} columnKey="key" width={0.4}>
                {name}
            </Cell>
            <Cell columnKey="value" width={0.6}>
                {value}
            </Cell>
        </div>
    );

    return (
        <div>
            <div className={styles.listParent}>
                {createAnnotationRow("File Name", fileDetails.name)}
                {createAnnotationRow("File ID", fileDetails.id)}
                {createAnnotationRow("File Type", fileDetails.type)}
                {createAnnotationRow("File Path", fileDetails.path)}
                {fileDetails.thumbnail &&
                    createAnnotationRow("Thumbnail Path", fileDetails.thumbnail)}
                {orderBy(fileDetails.annotations, ["name"]).map((a) =>
                    createAnnotationRow(a.name, a.values.map((v) => `${v}`).join(", "))
                )}
            </div>
        </div>
    );
}
