export type { NavigationGroup, Page } from "./types";

import { OTHER_RESOURCES_CONTENT } from "./other-resources";
import { GroupSlug, NavigationGroup } from "./types";

export const CONTENT: NavigationGroup[] = [
    {
        slug: GroupSlug.OtherResources,
        title: "Other resources",
        pages: OTHER_RESOURCES_CONTENT,
    },
];
