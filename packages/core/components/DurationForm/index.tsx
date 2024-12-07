import * as React from "react";

import NumberField from "../NumberRangePicker/NumberField";
import annotationFormatterFactory, { AnnotationType } from "../../entity/AnnotationFormatter";

import styles from "./DurationForm.module.css";

interface DurationFormProps {
    className?: string;
    defaultValue?: number;
    onChange: (totalDuration: number) => void;
    title?: string;
}

/**
 * This component renders a simple form for entering durations
 */
export default function DurationForm(props: DurationFormProps) {
    const { onChange } = props;
    const [days, setDurationDays] = React.useState<string>("0");
    const [hours, setDurationHours] = React.useState<string>("0");
    const [minutes, setDurationMinutes] = React.useState<string>("0");
    const [seconds, setDurationSeconds] = React.useState<string>("0");
    const durationFormatter = annotationFormatterFactory(AnnotationType.DURATION);

    React.useEffect(() => {
        const durationString = `${Number(days) || 0}D ${Number(hours) || 0}H ${
            Number(minutes) || 0
        }M ${Number(seconds) || 0}S`;
        const totalDurationInMs = Number(durationFormatter.valueOf(durationString));
        onChange(totalDurationInMs);
    }, [days, hours, minutes, seconds, durationFormatter, onChange]);

    return (
        <div>
            <h3 className={styles.title}>{props?.title}</h3>
            <div className={styles.inputWrapper}>
                <NumberField
                    aria-label="Days"
                    className={styles.inputField}
                    id="durationDays"
                    label="Days"
                    onChange={(event) => setDurationDays(event?.target?.value || "")}
                    defaultValue={days}
                />
                <NumberField
                    aria-label="Hours"
                    className={styles.inputField}
                    id="durationHours"
                    label="Hrs"
                    onChange={(event) => setDurationHours(event?.target?.value || "")}
                    defaultValue={hours}
                />
                <NumberField
                    aria-label="Minutes"
                    className={styles.inputField}
                    id="durationMinutes"
                    label="Mins"
                    onChange={(event) => setDurationMinutes(event?.target?.value || "")}
                    defaultValue={minutes}
                />
                <NumberField
                    aria-label="Seconds"
                    className={styles.inputField}
                    id="durationSeconds"
                    label="Secs"
                    onChange={(event) => setDurationSeconds(event?.target?.value || "")}
                    defaultValue={seconds}
                />
            </div>
        </div>
    );
}
