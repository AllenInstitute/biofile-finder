import * as React from "react";
import { useLocation, useParams } from "react-router-dom";

import { CONTENT } from "./content";
import DocPage from "./DocPage";
import Sidebar from "./Sidebar";
import NotFound from "../NotFound";
import { PrimaryButton } from "../../../../core/components/Buttons";
import StatusMessage from "../../../../core/components/StatusMessage";

import styles from "./UserGuide.module.css";

export default function UserGuide() {
    const { groupSlug, pageSlug } = useParams<{
        groupSlug: string;
        pageSlug: string;
    }>();
    const location = useLocation();
    const [menuOpen, setMenuOpen] = React.useState(false);
    const contentRef = React.useRef<HTMLDivElement>(null);

    const group = CONTENT.find((g) => g.slug === groupSlug);
    const page = group?.pages.find((p) => p.slug === pageSlug);

    // Enables single-page navigation to specific sections
    // of the user guide via URL hash (e.g. /user-guide/section/page#heading)
    React.useEffect(() => {
        setMenuOpen(false);
        const container = contentRef.current;
        if (!container) return;
        // Scroll to the linked section heading (#id) when the URL has a hash;
        // otherwise reset to the top of the page on navigation.
        if (location.hash) {
            const target = document.getElementById(decodeURIComponent(location.hash.slice(1)));
            if (target) {
                target.scrollIntoView();
                return;
            }
        }
        container.scrollTop = 0;
    }, [location.pathname, location.hash]);

    // Close mobile menu on Escape — standard accessibility expectation for overlays
    React.useEffect(() => {
        if (!menuOpen) return;
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape") setMenuOpen(false);
        };
        document.addEventListener("keydown", handleKeyDown);
        return () => document.removeEventListener("keydown", handleKeyDown);
    }, [menuOpen]);

    return (
        <div className={styles.root}>
            {/* Mobile page picker */}
            <div className={styles.mobileNav}>
                <div className={styles.mobileMenuTrigger}>
                    <PrimaryButton
                        text="USER GUIDE MENU"
                        iconName={menuOpen ? "ChevronUp" : "ChevronDown"}
                        title="Open user guide navigation"
                        onClick={() => setMenuOpen((prev) => !prev)}
                    />
                </div>
                {menuOpen && (
                    <>
                        <div
                            className={styles.mobileMenuBackdrop}
                            onClick={() => setMenuOpen(false)}
                        />
                        <div className={styles.mobileMenu}>
                            <Sidebar activeGroupSlug={groupSlug} activePageSlug={pageSlug} />
                        </div>
                    </>
                )}
            </div>

            {/* Desktop sidebar */}
            <aside className={styles.sidebar}>
                <Sidebar activeGroupSlug={groupSlug} activePageSlug={pageSlug} />
            </aside>

            {/* Main content */}
            <div ref={contentRef} className={styles.content}>
                {group && page ? <DocPage group={group} page={page} /> : <NotFound />}
            </div>

            <StatusMessage />
        </div>
    );
}
