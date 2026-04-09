import { DatePicker } from "@fluentui/react";
import * as React from "react";

import styles from "./DateTimePicker.module.css";

interface DateTimePickerProps {
    className?: string;
    placeholder: string;
    defaultDate?: Date;
    onSelectDate: (date: Date | null | undefined) => void;
    showTimeSelection?: boolean; // Show time input; default false
}

/**
 * DatePicker that can also function as DateTimePicker
 * by including showTimeSelection prop
 */
export default function DateTimePicker(props: DateTimePickerProps) {
    const { onSelectDate } = props;
    const [date, setDate] = React.useState<Date | undefined>(props?.defaultDate);
    const [time, setTime] = React.useState<string | undefined>("");

    React.useEffect(() => {
        if (!date && !time) return;
        // Prioritize the date from datePicked, otherwise set to today
        const combinedDateTime: Date = date || new Date();
        if (time) {
            combinedDateTime.setHours(Number(time.split(":")[0]));
            combinedDateTime.setMinutes(Number(time.split(":")[1]));
            combinedDateTime.setSeconds(Number(time.split(":")[2]));
        }
        onSelectDate(combinedDateTime);
    }, [date, time, onSelectDate]);

    return (
        <>
            <DatePicker
                className={props?.className}
                styles={{
                    root: styles.dateRangeRoot,
                    readOnlyPlaceholder: styles.readOnlyPlaceholder,
                    textField: styles.dateRangeTextField,
                }}
                placeholder={props.placeholder}
                onSelectDate={(date) => setDate(date || undefined)}
                value={date}
            />
            {props?.showTimeSelection && (
                <input
                    type="time"
                    className={styles.timePicker}
                    step="2"
                    onChange={(ev) => setTime(ev.target.value)}
                    value={time}
                />
            )}
        </>
    );
}

DateTimePicker.defaultProps = {
    showTimeSelection: false,
};
