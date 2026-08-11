/**
 * Single source of truth for the home page copy and links.
 *
 * Keeping content here (rather than inline in JSX) keeps the section
 * components small and declarative, and makes future copy edits a
 * one-file change with no markup risk.
 */
import * as React from "react";

import { EXAMPLE_DATASET_URL } from "../../constants";

import ClockGraphic from "../../../assets/home_clock_graphic.svg";
import PeopleShareGraphic from "../../../assets/home_people_share_graphic.svg";
import GroupFilterGraphic from "../../../assets/home_group_filter_graphic.png";
import ThumbnailsGraphic from "../../../assets/home_thumbnails_graphic.svg";

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
    /**
     * Optional graphic shown above the heading.
     * `src` is a URL string for raster images (PNG) or a React component for
     * SVGs (which react-svg-loader compiles to React components, not URLs).
     */
    image?: {
        src: string | React.FC<React.SVGProps<SVGSVGElement>>;
        alt: string;
        /** True for small icon-sized marks; omit for full-width screenshots. */
        icon?: boolean;
    };
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

// Ordered to match the 2x2 grid layout (left-to-right, top-to-bottom).
export const WHY_CARDS: AccentCard[] = [
    {
        accent: "Reduce time",
        heading: "to find the right files",
        body:
            "Search, filter, and browse large, distributed datasets using the metadata you already maintain—without digging through folders or filenames.",
        image: { src: ClockGraphic, alt: "Clock icon", icon: true },
    },
    {
        accent: "Improve collaboration",
        heading: "and reproducibility",
        body:
            "Share persistent, interactive dataset views so collaborators can open the same filtered, organized state and see the exact view you see.",
        image: { src: PeopleShareGraphic, alt: "People sharing a dataset icon", icon: true },
    },
    {
        accent: "Dynamically organize",
        heading: "and curate datasets",
        body:
            "Filter, group, and restructure collections using hierarchical views—without modifying underlying metadata or breaking existing reference.",
        image: {
            src: GroupFilterGraphic,
            alt: "Group-by and filter controls in the BioFile Finder interface",
        },
    },
    {
        accent: "Quick visual confirmation",
        heading: "with thumbnails",
        body:
            "Preview responsive thumbnails designed for scale, making it easier to verify files, spot patterns, and focus on relevant data.",
        image: {
            src: ThumbnailsGraphic,
            alt: "Thumbnail previews of imaging data",
        },
    },
];

/** Subtitle beneath the "How does BioFile Finder work?" heading. */
export const HOW_SUBTITLE =
    "BFF is designed so that you can incorporate it into your existing workflow.";

export const HOW_CARDS: AccentCard[] = [
    {
        accent: "Decentralized storage system",
        heading: "",
        body:
            "Work from metadata while files remain distributed across local storage, shared drives, or institutional systems—no copying or setup required.",
    },
    {
        accent: "Integrates with existing tools",
        heading: "",
        body:
            "BioFile Finder serves as a lightweight entry point, connecting metadata exploration with the applications you already use.",
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
