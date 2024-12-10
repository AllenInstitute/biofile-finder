const msInASecond = 1000;
const msInAMinute = 60 * msInASecond;
const msInAnHour = 60 * msInAMinute;
const msInADay = 24 * msInAnHour;

export default {
    displayValue(value: string | number): string {
        let remainingMs = Number(value);
        let display = "";

        function addUnit(unitInMs: number, unit: string, useFloor = true) {
            const numUnit = useFloor ? Math.floor(remainingMs / unitInMs) : remainingMs / unitInMs;
            if (numUnit > 0) {
                display += `${numUnit}${unit} `;
                remainingMs -= numUnit * unitInMs;
            }
        }

        addUnit(msInADay, "D");
        addUnit(msInAnHour, "H");
        addUnit(msInAMinute, "M");
        // Since seconds can have values like "3.5S", don't use floor when calculating
        addUnit(msInASecond, "S", false);

        return display.trim();
    },

    valueOf(value: any) {
        const RANGE_OPERATOR_REGEX = /([0-9]+)D ([0-9]+)H ([0-9]+)M ([0-9]*\.?[0-9]+)S/g;
        const exec = RANGE_OPERATOR_REGEX.exec(value);
        // Check if value is a pre-formatted duration string
        if (exec) {
            const daysInMs = Number(exec[1]) * msInADay;
            const hrsInMs = Number(exec[2]) * msInAnHour;
            const minsInMs = Number(exec[3]) * msInAMinute;
            const secsInMs = Number(exec[4]) * msInASecond;
            return daysInMs + hrsInMs + minsInMs + secsInMs;
        }
        return Number(value);
    },
};
