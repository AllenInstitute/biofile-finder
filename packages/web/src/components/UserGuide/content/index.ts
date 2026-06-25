// Content is split into per-section files to keep each file focused and reviewable.
// To add a new page: add its entry to the relevant section file.

export type { Page } from "./types";

import { ABOUT_CONTENT } from "./about";
import { APP_INFORMATION_CONTENT } from "./app-information";
import { GETTING_STARTED_CONTENT } from "./getting-started";
import { OTHER_RESOURCES_CONTENT } from "./other-resources";
import { REAL_WORLD_USE_CASES_CONTENT } from "./real-world-use-cases";
import { Page } from "./types";

export interface NavigationGroup {
    slug: string;
    title: string;
    pages: Page[];
}

export const CONTENT: NavigationGroup[] = [
    {
        slug: "about",
        title: "About",
        pages: ABOUT_CONTENT,
    },
    {
        slug: "app-information",
        title: "App Information",
        pages: APP_INFORMATION_CONTENT,
    },
    {
        slug: "real-world-use-cases",
        title: "Real World Use",
        pages: REAL_WORLD_USE_CASES_CONTENT,
    },
    {
        slug: "getting-started",
        title: "Getting Started",
        pages: GETTING_STARTED_CONTENT,
    },
    {
        slug: "other-resources",
        title: "Other Resources",
        pages: OTHER_RESOURCES_CONTENT,
    },
];
