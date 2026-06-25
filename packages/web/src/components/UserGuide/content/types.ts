import * as React from "react";

interface Section {
    heading?: string;
    /**
     * Heading level rendered for this section (h2, h3, or h4).
     * Defaults to h2 if omitted. Use h3/h4 for subsections within a page.
     */
    level?: 2 | 3 | 4;
    body: React.ReactNode;
}

export interface Page {
    slug: string;
    title: string;
    intro?: string;
    sections: Section[];
}
