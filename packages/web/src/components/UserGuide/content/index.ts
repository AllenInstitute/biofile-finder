// Content is split into per-section files to keep each file focused and reviewable.
// To add a new page: add its entry to the relevant section file.

export type { NavigationGroup, Page } from "./types";

import { ABOUT_CONTENT } from "./about";
import { APP_INFORMATION_CONTENT } from "./app-information";
import { GETTING_STARTED_CONTENT } from "./getting-started";
import { OTHER_RESOURCES_CONTENT } from "./other-resources";
import { REAL_WORLD_USE_CASES_CONTENT } from "./real-world-use-cases";
import { GroupSlug, NavigationGroup } from "./types";

export const CONTENT: NavigationGroup[] = [
    {
        slug: GroupSlug.About,
        title: "About",
        pages: ABOUT_CONTENT,
    },
    {
        slug: GroupSlug.RealWorldUseCases,
        title: "Real world use",
        pages: REAL_WORLD_USE_CASES_CONTENT,
    },
    {
        slug: GroupSlug.AppInformation,
        title: "App information",
        pages: APP_INFORMATION_CONTENT,
    },
    {
        slug: GroupSlug.GettingStarted,
        title: "Getting started",
        pages: GETTING_STARTED_CONTENT,
    },
    {
        slug: GroupSlug.OtherResources,
        title: "Other resources",
        pages: OTHER_RESOURCES_CONTENT,
    },
];
