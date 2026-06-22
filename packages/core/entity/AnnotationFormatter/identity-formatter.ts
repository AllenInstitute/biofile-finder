import { PrimitiveMetadataValue } from "../../services/FileService";

export default {
    displayValue(value: PrimitiveMetadataValue): string {
        return String(value);
    },

    valueOf(value: PrimitiveMetadataValue): PrimitiveMetadataValue {
        return value;
    },
};
