import FileFilter from "../../entity/FileFilter";

export interface ChatMessage {
    role: "user" | "assistant";
    content: string;
    timestamp: number;
    appliedFilters?: FileFilter[];
}

export interface LLMFilterInstruction {
    annotationName: string;
    annotationValue: any;
    filterType: "default" | "fuzzy" | "include" | "exclude";
}

export interface LLMSortInstruction {
    annotationName: string;
    order: "ASC" | "DESC";
}

export interface LLMResponse {
    filters: LLMFilterInstruction[];
    sort?: LLMSortInstruction | null;
    removeFilters?: { annotationName: string }[];
    message: string;
}
