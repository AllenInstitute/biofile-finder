import { DirectionalHint, IContextualMenuItem } from "@fluentui/react";
import * as React from "react";

import { SecondaryButton } from "../../../../core/components/Buttons";
import { EXAMPLE_DATASET_URL } from "../../constants";

/**
 * The two ways to launch the app:
 *   - "Start with your data"     -> the app's data-source picker (/app)
 *   - "Explore example dataset"  -> the app pre-loaded with a public dataset
 *
 * Defined once here and shared by the desktop dropdown (below), the home page
 * "How do I get started?" section, and the Header's mobile menu submenu so the
 * entry points stay in exactly one place.
 */
export const LAUNCH_APP_MENU_ITEMS: IContextualMenuItem[] = [
    {
        key: "your-data",
        text: "Start with your data",
        href: "/app",
        target: "_self",
    },
    {
        key: "example-dataset",
        text: "Explore example dataset",
        href: EXAMPLE_DATASET_URL,
        target: "_self",
    },
];

interface LaunchAppMenuProps {
    className?: string;
}

/** Dropdown button that launches the app (desktop nav + get-started section). */
export default function LaunchAppMenu(props: LaunchAppMenuProps) {
    return (
        <SecondaryButton
            className={props.className}
            text="Launch app"
            menuIconName="ChevronDown"
            menuDirection={DirectionalHint.bottomAutoEdge}
            menuItems={LAUNCH_APP_MENU_ITEMS}
        />
    );
}
