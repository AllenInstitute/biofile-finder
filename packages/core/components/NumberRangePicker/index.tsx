import { Icon, Spinner, SpinnerSize } from "@fluentui/react";
import classNames from "classnames";
import * as React from "react";

import { PrimaryButton, TertiaryButton } from "../Buttons";
import FileFilter from "../../entity/FileFilter";
import { extractValuesFromRangeOperatorFilterString } from "../../entity/AnnotationFormatter/number-formatter";
import { AnnotationValue } from "../../services/AnnotationService";

import styles from "./NumberRangePicker.module.css";

export interface ListItem {
    displayValue: AnnotationValue;
    value: AnnotationValue;
}

interface NumberRangePickerProps {
    className?: string;
    disabled?: boolean;
    errorMessage?: string;
    title?: string;
    items: ListItem[];
    loading?: boolean;
    onSearch: (filterValue: string) => void;
    onReset?: () => void;
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
    const { errorMessage, items, loading, onSearch, currentRange, units } = props;

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

    // Instead of removing filter completely, reset to min and max and submit
    function onResetSearch() {
        setSearchMinValue(overallMin);
        setSearchMaxValue(overallMax);
        onSearch(`RANGE(${overallMin},${overallMax})`);
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
        return (
            <div className={classNames(styles.container, props.className)}>
                Whoops! Encountered an error: {errorMessage}
            </div>
        );
    }

    if (loading) {
        return (
            <div className={classNames(styles.container, props.className)}>
                <Spinner size={SpinnerSize.small} />
            </div>
        );
    }

    return (
        <div
            className={classNames(styles.container, props.className)}
            data-is-scrollable="true"
            data-is-focusable="true"
        >
            <h3 className={styles.title}>{units ? `${props.title} (in ${units})` : props.title}</h3>
            <div className={styles.header}>
                <div className={styles.inputs}>
                    <div className={styles.inputField}>
                        <label htmlFor="rangemin">Min (inclusive)</label>
                        <input
                            aria-label="Input a minimum value (inclusive)"
                            data-testid="rangemin"
                            id="rangemin"
                            type="number"
                            value={searchMinValue}
                            step="any"
                            onChange={onMinChange}
                            min={Number(overallMin)}
                            max={Number(overallMax)}
                        />
                    </div>
                    <div className={styles.rangeSeperator}>
                        <Icon iconName="Forward" />
                    </div>
                    <div className={styles.inputField}>
                        <label htmlFor="rangemax">Max (exclusive)</label>
                        <input
                            aria-label="Input a maximum value (exclusive)"
                            data-testid="rangemax"
                            id="rangemax"
                            type="number"
                            value={searchMaxValue}
                            step="any"
                            onChange={onMaxChange}
                            min={Number(overallMin)}
                            max={Number(overallMax)}
                        />
                    </div>
                    <div className={styles.resetButtonContainer}>
                        <TertiaryButton
                            className={styles.resetButton}
                            title="Reset filter"
                            onClick={onResetSearch}
                            iconName="Clear"
                            id="reset-filter"
                        />
                    </div>
                </div>
            </div>
            <div className={styles.footer}>
                {overallMin && overallMax && (
                    <div className={styles.footerLeft}>
                        <div> Full range available: </div>
                        <div>
                            {overallMin}, {overallMax}
                        </div>
                    </div>
                )}
                <div className={styles.footerRight}>
                    <PrimaryButton
                        disabled={!searchMinValue && !searchMaxValue}
                        text="Submit"
                        className={classNames(
                            {
                                [styles.disabled]: !searchMinValue && !searchMaxValue,
                            },
                            styles.submitButton
                        )}
                        title={searchMinValue || searchMaxValue ? "" : "No options selected"}
                        onClick={onSubmitRange}
                    />
                </div>
            </div>
        </div>
    );
}
