import { DirectionalHint } from "@fluentui/react";
import * as React from "react";

import { SecondaryButton } from "../../../../core/components/Buttons";
import { EXAMPLE_DATASET_URL } from "../../constants";

/**
 * Dropdown button that launches the app. Offers two entry points:
 *   - "Start with your data"     -> the app's data-source picker (/app)
 *   - "Explore example dataset"  -> the app pre-loaded with a public dataset
 *
 * Shared by the global Header nav and the home page "How do I get started?"
 * section so the entry points stay defined in exactly one place.
 */
interface LaunchAppMenuProps {
    className?: string;
}

export default function LaunchAppMenu(props: LaunchAppMenuProps) {
    return (
        <SecondaryButton
            className={props.className}
            title="Launch app"
            text="Launch app"
            menuIconName="ChevronDown"
            menuDirection={DirectionalHint.bottomAutoEdge}
            menuItems={[
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
            ]}
        />
    );
}
