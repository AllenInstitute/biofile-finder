import { map } from "lodash";
import * as React from "react";
import { useSelector } from "react-redux";

import FileRow from "../../components/FileRow";
import { selection } from "../../state";

const styles = require("./Header.module.css");

/**
 * TODO
 */
function Header(
    { children, ...rest }: React.PropsWithChildren<{}>,
    ref: React.Ref<HTMLDivElement>
) {
    const annotations = useSelector(selection.selectors.getAnnotationsToDisplay);

    const headerCells = map(annotations, (annotation) => ({
        columnKey: annotation.name, // needs to match the value used to produce `column`s passed to the `useResizableColumns` hook
        displayValue: annotation.displayName,
        width: 1 / annotations.length,
    }));

    return (
        <div ref={ref} {...rest}>
            <div className={styles.headerWrapper}>
                <FileRow cells={headerCells} className={styles.header} />
            </div>
            {children}
        </div>
    );
}

export default React.forwardRef<HTMLDivElement, React.PropsWithChildren<{}>>(Header);
