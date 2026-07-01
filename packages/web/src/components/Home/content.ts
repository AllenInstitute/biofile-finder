/**
 * Single source of truth for the home page copy and links.
 *
 * Keeping content here (rather than inline in JSX) keeps the section
 * components small and declarative, and makes future copy edits a
 * one-file change with no markup risk.
 */
import { EXAMPLE_DATASET_URL } from "../../constants";

/** Route/URL targets used across the page. */
export const LINKS = {
    app: "/app",
    datasets: "/datasets",
    tryNow: EXAMPLE_DATASET_URL,
    userGuide: "/user-guide",
    userGuideSetupOverview: "/user-guide/getting-started/setup-overview",
    userGuideUseCases: "/user-guide/real-world-use-cases/use-cases",
    // External resources (open in a new tab).
    publication: "https://www.nature.com/articles/s41592-026-03130-w",
    supportForum: "https://github.com/AllenInstitute/biofile-finder/discussions/categories/q-a",
    github: "https://github.com/AllenInstitute/biofile-finder",
    email: "mailto:aics_software_support@alleninstitute.org",
};

/**
 * A card whose heading leads with an emphasized (accent-colored) phrase
 * followed by the rest of the heading, then a description.
 * Used by the "Why" and "How it works" grids.
 */
export interface AccentCard {
    /** Emphasized lead-in phrase, rendered in the accent color. */
    accent: string;
    /** Remainder of the heading, rendered inline after the accent phrase. */
    heading: string;
    body: string;
}

/** A card with a plain title, body, and a call-to-action button. */
export interface ActionCard {
    title: string;
    body: string;
    cta: {
        text: string;
        href: string;
        /** External links open in a new tab with an indicator icon. */
        external?: boolean;
    };
}

export const INTRO_BODY =
    "BioFile Finder (BFF) is a web-based tool for exploring large-scale biological imaging datasets. It allows users to query structured metadata and link results directly to image assets.";

export const WHY_CARDS: AccentCard[] = [
    {
        accent: "Reduce time",
        heading: "to find the right files",
        body:
            "Search, filter, and browse large, distributed datasets using the metadata you already maintain—without digging through folders or filenames.",
    },
    {
        accent: "Dynamically organize",
        heading: "and curate datasets",
        body:
            "Filter, group, and restructure collections using hierarchical views—without modifying underlying metadata or breaking existing references.",
    },
    {
        accent: "Improve collaboration",
        heading: "and reproducibility",
        body:
            "Share persistent, interactive dataset views so collaborators can open the same filtered, organized state and see the exact view you see.",
    },
    {
        accent: "Quick confirmation",
        heading: "with visual previews",
        body:
            "Preview responsive thumbnails designed for scale, making it easier to verify files, spot patterns, and focus on relevant data for deeper analysis.",
    },
];

export const HOW_CARDS: AccentCard[] = [
    {
        accent: "Explore datasets",
        heading: "without duplication",
        body:
            "Work from metadata while files remain distributed across local storage, shared drives, or institutional systems—no copying or setup required.",
    },
    {
        accent: "Less time",
        heading: "managing files",
        body:
            "Work with complex data using a free, open-source, web-based tool that fits research workflows—no licensing barriers or vendor lock-in.",
    },
];

export const NEXT_CARDS: ActionCard[] = [
    {
        title: "See how scientists use BFF",
        body:
            "BioFile Finder has been used across many dataset types to support the release of published datasets and ongoing work.",
        cta: { text: "Explore use cases", href: LINKS.userGuideUseCases },
    },
    {
        title: "Learn more",
        body:
            "Visit our user guide for guidance on how to get started with your own data and other helpful resources.",
        cta: { text: "Visit user guide", href: LINKS.userGuide },
    },
    {
        title: "Browse dataset collections",
        body:
            "Explore open-source datasets for open use or to test drive the app and its features.",
        cta: { text: "View datasets", href: LINKS.datasets },
    },
];

/** Links in the "Engage with us" footer band. */
export const ENGAGE_LINKS: { text: string; href: string }[] = [
    { text: "Visit support forum", href: LINKS.supportForum },
    { text: "Visit GitHub", href: LINKS.github },
    { text: "Contact via email", href: LINKS.email },
];
