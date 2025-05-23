const msInASecond = 1000;
const msInAMinute = 60 * msInASecond;
const msInAnHour = 60 * msInAMinute;
const msInADay = 24 * msInAnHour;

export default {
    displayValue(value: string | number): string {
        let remainingMs = Number(value);
        // Without this check, would return 0 as a number rather than string
        if (!remainingMs) return "0S";

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
        // Check for pre-formatted duration strings: must have at least one of #D, #H, #M, or #S in that order
        const regexMatch = value.match(
            /^(([0-9]+)D)?\s?(([0-9]+)H)?\s?(([0-9]+)M)?\s?(([0-9]*\.?[0-9]+)S)?$/
        );
        if (regexMatch) {
            // Capture group order is [full string, aD, a, bH, b, cM, c, dS, d]
            const daysInMs = (Number(regexMatch[2]) || 0) * msInADay;
            const hrsInMs = (Number(regexMatch[4]) || 0) * msInAnHour;
            const minsInMs = (Number(regexMatch[6]) || 0) * msInAMinute;
            const secsInMs = (Number(regexMatch[8]) || 0) * msInASecond;
            return daysInMs + hrsInMs + minsInMs + secsInMs;
        }
        return Number(value);
    },
};
