import { ActionButton, Spinner, SpinnerSize } from "@fluentui/react";
import classNames from "classnames";
import * as React from "react";
import FileFilter from "../../entity/FileFilter";
import { extractValuesFromRangeOperatorFilterString } from "../../entity/AnnotationFormatter/number-formatter";
import { AnnotationValue } from "../../services/AnnotationService";

import styles from "./NumberRangePicker.module.css";

export interface ListItem {
    displayValue: AnnotationValue;
    value: AnnotationValue;
}

interface NumberRangePickerProps {
    disabled?: boolean;
    errorMessage?: string;
    items: ListItem[];
    loading?: boolean;
    onSearch: (filterValue: string) => void;
    onReset: () => void;
    currentRange: FileFilter | undefined;
    units?: string;
}

/**
 * A NumberRangePicker is a simple form that renders input fields for the minimum and maximum values
 * desired by the user and buttons to submit and reset the range. It also displays the
 * overall min and max for that annotation, if available, and allows a user to select that full range.
 *
 * It is best suited for selecting items that are numbers.
 */
export default function NumberRangePicker(props: NumberRangePickerProps) {
    const { errorMessage, items, loading, onSearch, onReset, currentRange, units } = props;

    const overallMin = React.useMemo(() => {
        return items[0]?.displayValue.toString() ?? "";
    }, [items]);
    const overallMax = React.useMemo(() => {
        return items.at(-1)?.displayValue.toString() ?? "";
    }, [items]);

    const [searchMinValue, setSearchMinValue] = React.useState(
        extractValuesFromRangeOperatorFilterString(currentRange?.value).minValue ?? overallMin
    );
    const [searchMaxValue, setSearchMaxValue] = React.useState(
        extractValuesFromRangeOperatorFilterString(currentRange?.value).maxValue ?? overallMax
    );

    function onResetSearch() {
        onReset();
        setSearchMinValue("");
        setSearchMaxValue("");
    }

    function onSelectFullRange() {
        setSearchMinValue(overallMin);
        setSearchMaxValue(overallMax);
        // Plus 1 here to ensure that actual max is not excluded for full range
        onSearch(`RANGE(${overallMin},${(Number(overallMax) + 1).toString()})`);
    }

    const onSubmitRange = () => {
        const {
            minValue: oldMinValue,
            maxValue: oldMaxValue,
        } = extractValuesFromRangeOperatorFilterString(currentRange?.value);
        const newMinValue = searchMinValue || oldMinValue || overallMin;
        const newMaxValue = searchMaxValue || oldMaxValue || (Number(overallMax) + 1).toString(); // Ensure that actual max is not excluded
        if (newMinValue && newMaxValue) {
            onSearch(`RANGE(${newMinValue},${newMaxValue})`);
        }
    };

    const onMinChange = (event?: React.ChangeEvent<HTMLInputElement>) => {
        if (event) {
            setSearchMinValue(event.target.value);
        }
    };
    const onMaxChange = (event?: React.ChangeEvent<HTMLInputElement>) => {
        if (event) {
            setSearchMaxValue(event.target.value);
        }
    };

    if (errorMessage) {
        return <div className={styles.container}>Whoops! Encountered an error: {errorMessage}</div>;
    }

    if (loading) {
        return (
            <div className={styles.container}>
                <Spinner size={SpinnerSize.small} />
            </div>
        );
    }

    return (
        <div className={styles.container} data-is-scrollable="true" data-is-focusable="true">
            <div className={styles.header}>
                <div className={styles.inputField}>
                    <label htmlFor="rangemin">Min (inclusive)</label>
                    <input
                        id="rangemin"
                        title="Min (inclusive)"
                        type="number"
                        value={searchMinValue}
                        step="any"
                        onChange={onMinChange}
                        min={Number(overallMin)}
                        max={Number(overallMax)}
                    />
                    {units}
                </div>
                <div className={styles.inputField}>
                    <label htmlFor="rangemax">Max (exclusive)</label>
                    <input
                        id="rangemax"
                        title="Max (exclusive)"
                        type="number"
                        value={searchMaxValue}
                        step="any"
                        onChange={onMaxChange}
                        min={Number(overallMin)}
                        max={Number(overallMax)}
                    />
                    {units}
                </div>
                <div className={styles.buttons}>
                    <ActionButton
                        ariaLabel="Submit"
                        className={classNames(
                            {
                                [styles.disabled]: !searchMinValue && !searchMaxValue,
                            },
                            styles.actionButton
                        )}
                        disabled={!searchMinValue && !searchMaxValue}
                        title={searchMinValue || searchMaxValue ? undefined : "No options selected"}
                        onClick={onSubmitRange}
                    >
                        Submit range
                    </ActionButton>
                    {onSelectFullRange && (
                        <ActionButton
                            ariaLabel="Select Full Range"
                            className={classNames(styles.actionButton)}
                            onClick={onSelectFullRange}
                        >
                            Select Full Range
                        </ActionButton>
                    )}
                    <ActionButton
                        ariaLabel="Reset"
                        className={classNames(styles.actionButton)}
                        title={"Clear filter"}
                        onClick={onResetSearch}
                    >
                        Reset
                    </ActionButton>
                </div>
            </div>
            <div className={styles.footer}>
                <h6>
                    Full range available: {overallMin}, {overallMax}
                </h6>
            </div>
        </div>
    );
}
