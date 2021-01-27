const msInADay = 24 * 60 * 60 * 1000;
const msInAnHour = 60 * 60 * 1000;
const msInAMinute = 60 * 1000;

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
        addUnit(1000, "S", false);

        return display.trim();
    },

    valueOf(value: any) {
        return Number(value);
    },
};
