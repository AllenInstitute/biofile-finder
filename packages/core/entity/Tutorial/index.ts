import { castArray } from "lodash";

interface TutorialStep {
    targetId: string;
    message: string | React.ReactNode;
}

/**
 * Entity responsible for containing information about a tutorial in which to guide
 * a user through
 */
export default class Tutorial {
    public static readonly ANNOTATION_HIERARCHY_ID = "annotation-hierarchy";
    public static readonly ANNOTATION_LIST_ID = "annotation-list";
    public static readonly COLLECTIONS_TITLE_ID = "collections-title";
    public static readonly COLUMN_HEADERS_ID = "column-headers";
    public static readonly COPY_URL_BUTTON_ID = "copy-url-button";
    public static readonly FILE_ATTRIBUTE_FILTER_ID = "file-attribute-filter";
    public static readonly FILE_LIST_ID = "file-list";
    public static readonly URL_BOX_ID = "url-box";
    public static readonly VIEWS_TITLE_ID = "views-title";

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
        return index > 0 && index < this.steps.length;
    }

    public getStep(index: number): TutorialStep {
        return this.steps[index];
    }

    public addStep(step: TutorialStep | TutorialStep[]): Tutorial {
        this.steps = [...this.steps, ...castArray(step)];
        return this;
    }

    public toString(): string {
        return `<Tutorial(title: ${this.title}, steps: ${this.steps})>`;
    }
}
