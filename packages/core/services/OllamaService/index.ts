import Annotation from "../../entity/Annotation";
import { FilterType } from "../../entity/FileFilter";

export interface OllamaFilterResult {
    filters: {
        name: string;
        value: string;
        type: FilterType;
    }[];
    hierarchy: string[];
    clear?: boolean;
}

export interface AnnotationContext {
    name: string;
    displayName: string;
    description: string;
    type: string;
    sampleValues?: (string | number | boolean)[];
}

export default interface OllamaService {
    isAvailable(): Promise<boolean>;
    generateFilterQuery(
        prompt: string,
        annotations: AnnotationContext[],
        currentFilters?: { name: string; value: string; type: string }[]
    ): Promise<OllamaFilterResult>;
}
