import { CONTENT, NavigationGroup, Page } from "./content";

interface PageWithGroup {
    group: NavigationGroup;
    page: Page;
}

const ALL_PAGES: PageWithGroup[] = CONTENT.flatMap((group) =>
    group.pages.map((page) => ({ group, page }))
);
const PAGE_KEY_TO_INDEX = new Map(
    ALL_PAGES.map(({ group, page }, index) => [`${group.slug}/${page.slug}`, index])
);

export function getAdjacentPages(
    group: NavigationGroup,
    page: Page
): {
    prev: PageWithGroup | null;
    next: PageWithGroup | null;
} {
    const pageKey = `${group.slug}/${page.slug}`;
    const idx = PAGE_KEY_TO_INDEX.get(pageKey);
    // Should never happen, but here for type safety
    if (idx === undefined) {
        console.error(`Invalid user guide page key: "${pageKey}". No adjacent pages available.`);
        return { prev: null, next: null };
    }
    return {
        prev: idx > 0 ? ALL_PAGES[idx - 1] : null,
        next: idx < ALL_PAGES.length - 1 ? ALL_PAGES[idx + 1] : null,
    };
}
