// Content is split into per-section files to keep each file focused and reviewable.
// To add a new page: add its entry to the relevant section file.
//
// NOTE: This engine PR ships a single seed section (Other resources) so the
// renderer, navigation, and routing can be reviewed against real content. The
// remaining sections (About, Real world use, App information, Getting started)
// land in the follow-up content PR, which expands the list below.

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
