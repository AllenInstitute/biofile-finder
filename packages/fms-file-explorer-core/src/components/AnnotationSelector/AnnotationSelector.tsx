import { DefaultButton, Dropdown, IDropdownOption, Icon, Label } from "office-ui-fabric-react";
import * as React from "react";

import { TOP_LEVEL_FILE_ANNOTATIONS } from "../../constants";

const styles = require("./AnnotationSelector.module.css");

const TOP_LEVEL_FILE_ANNOTATION_SET = new Set(TOP_LEVEL_FILE_ANNOTATIONS.map((a) => a.displayName));

interface AnnotationSelectorProps {
    className?: string;
    annotationOptions: string[];
    annotations: string[];
    setAnnotations: (columns: string[]) => void;
}

/**
 * TODO
 */
export default function AnnotationSelector(props: AnnotationSelectorProps) {
    const { className, annotationOptions, annotations, setAnnotations } = props;
    const annotationSet = new Set(annotations);

    const removeColumn = (column: string) => {
        setAnnotations(annotations.filter((c) => c !== column));
    };
    const addColumn = (
        _: React.FormEvent<HTMLDivElement>,
        option?: IDropdownOption | undefined
    ) => {
        if (option) {
            const column = option.key as string;
            if (annotationSet.has(column)) {
                removeColumn(column);
            } else {
                // Place the "top level file attributes" at the top of the selected column list
                setAnnotations(
                    [...annotations, column].sort((a, b) => {
                        if (TOP_LEVEL_FILE_ANNOTATION_SET.has(a)) {
                            if (!TOP_LEVEL_FILE_ANNOTATION_SET.has(b)) {
                                return -1;
                            }
                        } else if (TOP_LEVEL_FILE_ANNOTATION_SET.has(b)) {
                            return 1;
                        }
                        return a.localeCompare(b);
                    })
                );
            }
        }
    };

    return (
        <div className={className}>
            <DefaultButton
                disabled={annotations.length === annotationOptions.length}
                onClick={() => setAnnotations(annotationOptions)}
                text="Select All"
            />
            <DefaultButton
                disabled={!annotations.length}
                onClick={() => setAnnotations([])}
                text="Select None"
            />
            <Dropdown
                multiSelect
                className={styles.dropdown}
                disabled={annotations.length === annotationOptions.length}
                label="Columns"
                onChange={addColumn}
                options={annotationOptions.map((a) => ({ key: a, text: a }))}
                placeholder="Select columns to include"
                selectedKeys={annotations}
                styles={{ dropdownItemsWrapper: { maxHeight: "250px" } }}
            />
            <Label>Selected Columns ({annotations.length} total)</Label>
            <ul className={styles.list}>
                {annotations.map((annotation) => (
                    <li className={styles.listItem} key={annotation}>
                        <Icon
                            className={styles.listItemIcon}
                            iconName="clear"
                            onClick={() => removeColumn(annotation)}
                            data-testid="column-deselect-icon"
                        />
                        {annotation}
                    </li>
                ))}
            </ul>
        </div>
    );
}
