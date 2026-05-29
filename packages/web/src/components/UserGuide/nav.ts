export type NavHeading = {
    id: string;
    text: string;
};

export type NavPage = {
    title: string;
    slug: string;
    // headings: reserved for possible future in-page anchor navigation in the sidebar
    headings?: NavHeading[];
};

export type NavSection = {
    title: string;
    slug: string;
    pages: NavPage[];
};

export const NAV: NavSection[] = [
    {
        title: "About",
        slug: "about",
        pages: [
            {
                title: "Overview",
                slug: "overview",
                headings: [
                    { id: "what-is-bff", text: "What is BioFile Finder?" },
                    { id: "who-is-bff-for", text: "Who is BFF for?" },
                    { id: "why-use-bff", text: "Why use BFF?" },
                    { id: "bff-comparison-table", text: "How BFF compares" },
                ],
            },
            {
                title: "Feature highlights",
                slug: "features",
                headings: [
                    { id: "in-browser-querying", text: "In-browser querying" },
                    { id: "dynamic-grouping", text: "Dynamic grouping & hierarchy" },
                    { id: "sharing", text: "Sharing" },
                    { id: "thumbnails", text: "Thumbnail previews" },
                    { id: "code-generation", text: "Code generation" },
                    { id: "viewer-integrations", text: "Viewer integrations" },
                ],
            },
        ],
    },
    {
        title: "Real world use",
        slug: "real-world-use-cases",
        pages: [
            {
                title: "Use cases & scenarios",
                slug: "use-cases-overview",
                headings: [
                    { id: "use-case-table", text: "How people use BFF" },
                    { id: "explore-screening", text: "Explore screening results" },
                    { id: "validate-metadata", text: "Validate metadata" },
                    { id: "inspect-subsets", text: "Inspect subsets of images" },
                    { id: "perform-qc", text: "Perform QC on datasets" },
                    { id: "manage-inventory", text: "Manage image inventory" },
                    { id: "real-world-scenarios", text: "Real-world scenarios" },
                ],
            },
            {
                title: "The cell science accelerator at Allen Institute",
                slug: "example-aics",
                headings: [
                    { id: "publication", text: "Publication" },
                    { id: "dataset", text: "Dataset" },
                ],
            },
            {
                title: "The brain science accelerator at Allen Institute",
                slug: "example-aibs",
                headings: [
                    { id: "publication", text: "Publication" },
                    { id: "dataset", text: "Dataset" },
                    { id: "video", text: "Video" },
                ],
            },
            {
                title: "AMBIOM at ISAS",
                slug: "example-isas",
                headings: [],
            },
        ],
    },
    {
        title: "App information",
        slug: "app-information",
        pages: [
            {
                title: "Specifications",
                slug: "specifications",
                headings: [
                    { id: "file-size-limitations", text: "File size limitations" },
                    { id: "compatible-file-formats", text: "Compatible file formats" },
                    { id: "preferred-browsers", text: "Preferred browsers" },
                    { id: "open-source", text: "Open source" },
                ],
            },
            {
                title: "Supported viewers",
                slug: "supported-viewers",
                headings: [
                    { id: "decision-guide", text: "Decision guide" },
                    { id: "viewer-table", text: "Viewer comparison table" },
                ],
            },
        ],
    },
    {
        title: "Getting started",
        slug: "getting-started",
        pages: [
            {
                title: "Setup overview",
                slug: "setup-overview",
                headings: [
                    { id: "basic-setup", text: "Basic setup" },
                    { id: "minimum-requirements", text: "Minimum requirements" },
                    { id: "common-workflows", text: "Common workflows" },
                    { id: "recommended-setup", text: "Recommended setup" },
                ],
            },
            {
                title: "Creating a dataset",
                slug: "creating-a-dataset",
                headings: [
                    { id: "creating-spreadsheet", text: "What is a dataset?" },
                    { id: "rows-columns", text: "Rows and columns" },
                    { id: "required-columns", text: "Required columns" },
                    { id: "optional-columns", text: "Optional special columns" },
                    { id: "spreadsheet-examples", text: "Spreadsheet examples" },
                ],
            },
            {
                title: "Metadata guidance",
                slug: "metadata-guidance",
                headings: [
                    { id: "recommendations", text: "Recommendations" },
                    { id: "column-descriptions", text: "Providing column descriptions" },
                    { id: "provenance", text: "File & metadata provenance" },
                ],
            },
            {
                title: "Provenance",
                slug: "provenance",
                headings: [
                    { id: "provenance-where", text: "Where to add the file" },
                    { id: "provenance-format", text: "File format" },
                    { id: "provenance-workflows", text: "Why provenance matters" },
                ],
            },
        ],
    },
    {
        title: "Other resources",
        slug: "other-resources",
        pages: [
            {
                title: "Storage options",
                slug: "storage-options",
                headings: [
                    { id: "cloud-storage", text: "Cloud storage" },
                    { id: "cloud-examples", text: "Cloud storage examples" },
                    { id: "hard-drive", text: "Local and network storage" },
                ],
            },
            {
                title: "Avoiding CORS errors",
                slug: "cors",
                headings: [{ id: "cors-setup", text: "Setting up CORS permissions" }],
            },
        ],
    },
];

export function getAdjacentPages(
    sectionSlug: string,
    pageSlug: string
): {
    prev: { section: NavSection; page: NavPage } | null;
    next: { section: NavSection; page: NavPage } | null;
} {
    const allPages: { section: NavSection; page: NavPage }[] = [];
    NAV.forEach((section) => section.pages.forEach((page) => allPages.push({ section, page })));
    const idx = allPages.findIndex(
        (p) => p.section.slug === sectionSlug && p.page.slug === pageSlug
    );
    return {
        prev: idx > 0 ? allPages[idx - 1] : null,
        next: idx < allPages.length - 1 ? allPages[idx + 1] : null,
    };
}
