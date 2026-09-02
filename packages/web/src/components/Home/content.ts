/**
 * All home page content: copy, card data, links, and asset references.
 * Section components import from here so that content edits live in one place.
 */
import * as React from "react";

import { WEB_LINKS } from "../../constants";
import ClockGraphic from "../../../assets/home_clock_graphic.svg";
import GroupFilterGraphic from "../../../assets/home_group_filter_graphic.png";
import HowBFFWorksGraphic from "../../../assets/home_how_BFF_works_graphic.png";
import PeopleShareGraphic from "../../../assets/home_people_share_graphic.svg";
import ThumbnailsGraphic from "../../../assets/home_thumbnails_graphic.svg";

/** Route/URL targets used across the page. */
export const LINKS = WEB_LINKS;

/**
 * A card whose heading leads with an emphasized (accent-colored) phrase
 * followed by the rest of the heading, then a description.
 * Used by the "Why" and "How it works" grids.
 */
export interface AccentCard {
    accent: string;
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

// ---------------------------------------------------------------------------
// Why BioFile Finder
// ---------------------------------------------------------------------------

// Ordered to match the 2x2 grid layout (left-to-right, top-to-bottom).
export const WHY_CARDS: AccentCard[] = [
    {
        accent: "Reduce time",
        heading: "to find the right files",
        body:
            "Search, filter, and browse large, distributed datasets using the metadata you already maintain without digging through folders or filenames.",
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
            "Filter, group, and restructure collections using hierarchical views without modifying underlying metadata or breaking existing reference.",
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
        image: { src: ThumbnailsGraphic, alt: "Thumbnail previews of imaging data" },
    },
];

// ---------------------------------------------------------------------------
// How It Works
// ---------------------------------------------------------------------------

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

/** Flow diagram rendered at the bottom of the How It Works section. */
export const HOW_GRAPHIC = HowBFFWorksGraphic;

// ---------------------------------------------------------------------------
// What Would You Like to Do Next?
// ---------------------------------------------------------------------------

export interface ActionCard {
    title: string;
    body: string;
    cta: { text: string; href: string; external?: boolean };
}

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

// ---------------------------------------------------------------------------
// Engage With Us
// ---------------------------------------------------------------------------

export const ENGAGE_LINKS = [
    { text: "Visit support forum", href: LINKS.supportForum },
    { text: "Visit GitHub", href: LINKS.github },
    { text: "Contact via email", href: LINKS.email },
];
