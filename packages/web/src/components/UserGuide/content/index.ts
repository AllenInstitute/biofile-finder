// Content is split into per-section files to keep each file focused and reviewable.
// To add a new page: add its entry to the relevant section file and add it to nav.ts.
// Note: PAGE_CONTENT keys must match the sectionSlug/pageSlug pattern used in nav.ts.

export type { PageContent, PageSection } from "./types";

import { ABOUT_CONTENT } from "./about";
import { APP_INFORMATION_CONTENT } from "./app-information";
import { GETTING_STARTED_CONTENT } from "./getting-started";
import { OTHER_RESOURCES_CONTENT } from "./other-resources";
import { REAL_WORLD_USE_CASES_CONTENT } from "./real-world-use-cases";

export const PAGE_CONTENT = {
    ...ABOUT_CONTENT,
    ...APP_INFORMATION_CONTENT,
    ...REAL_WORLD_USE_CASES_CONTENT,
    ...GETTING_STARTED_CONTENT,
    ...OTHER_RESOURCES_CONTENT,
};
