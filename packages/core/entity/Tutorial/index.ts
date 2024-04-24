import { castArray } from "lodash";

interface TutorialStep {
    targetId: string;
    message: string | React.ReactNode;
}

/**
 * Entity responsible for containing information about a tutorial in which to guide
 * a user through. The "targetId" on each step is what the <TutorialTooltip /> uses to
 * find and display the corresponding "message".
 */
export default class Tutorial {
    public static readonly ADD_QUERY_BUTTON_ID = "add-query-button";
    public static readonly COLUMN_HEADERS_ID = "column-headers";
    public static readonly FILE_ATTRIBUTE_FILTER_ID = "file-attribute-filter";
    public static readonly FILE_LIST_ID = "file-list";
    public static readonly FILTER_HEADER_ID = "filter-header-id";
    public static readonly GROUPING_HEADER_ID = "grouping-header";
    public static readonly SHARE_BUTTON_ID = "share-button";
    public static readonly SORT_HEADER_ID = "sort-header";

    public readonly title: string;
    private steps: TutorialStep[];

    public constructor(title: string, steps: TutorialStep[] = []) {
        this.title = title;
        this.steps = steps;
    }

    public get length(): number {
        return this.steps.length;
    }

    public hasStep(index: number): boolean {
        return index >= 0 && index < this.steps.length;
    }

    public getStep(index: number): TutorialStep {
        return this.steps[index];
    }

    public addStep(step: TutorialStep | TutorialStep[]): Tutorial {
        this.steps = [...this.steps, ...castArray(step)];
        return this;
    }

    public toString(): string {
        return `<Tutorial(title: ${this.title}, steps: ${JSON.stringify(this.steps)})>`;
    }
}
