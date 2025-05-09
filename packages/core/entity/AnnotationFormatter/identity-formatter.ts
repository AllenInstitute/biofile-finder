export default {
    displayValue(value: any): string {
        if (typeof value === 'object' && !Array.isArray(value) && value !== null) {
            return JSON.stringify(value);
        }
        return String(value);
    },

    valueOf(value: any) {
        return value;
    },
};
