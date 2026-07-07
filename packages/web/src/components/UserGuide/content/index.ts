// This engine PR ships a single seed section (Other resources) so the renderer,
// navigation, and routing can be reviewed against real content. The remaining
// sections land in the follow-up content PR, which expands the list below.

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
