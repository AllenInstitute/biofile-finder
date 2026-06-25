import * as React from "react";
import { useDispatch } from "react-redux";
import { Navigate, useLocation, useParams } from "react-router-dom";

import { CONTENT } from "./content";
import DocPage from "./DocPage";
import Sidebar from "./Sidebar";
import { interaction } from "../../../../core/state";
import { PrimaryButton } from "../../../../core/components/Buttons";
import StatusMessage from "../../../../core/components/StatusMessage";

import styles from "./UserGuide.module.css";

export default function UserGuide() {
    const dispatch = useDispatch();
    const { groupSlug, pageSlug } = useParams<{
        groupSlug: string;
        pageSlug: string;
    }>();
    const location = useLocation();
    const [menuOpen, setMenuOpen] = React.useState(false);
    const contentRef = React.useRef<HTMLDivElement>(null);

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

    const group = CONTENT.find((g) => g.slug === groupSlug);
    if (!groupSlug || !group) {
        // If the user was trying to navigate to a group but we can't find it, show a message and redirect to the first page in the first group.
        const firstGroup = CONTENT[0];
        if (groupSlug) {
            dispatch(
                interaction.actions.processInfo(
                    groupSlug,
                    `The user guide page "${groupSlug}" could not be found. Redirecting to the "${firstGroup.title}" page.`
                )
            );
        }
        return (
            <Navigate to={`/user-guide/${firstGroup.slug}/${firstGroup.pages[0].slug}`} replace />
        );
    }

    const page = group.pages.find((p) => p.slug === pageSlug);
    if (!pageSlug || !page) {
        // If the user was trying to navigate to a page but we can't find it, show a message and redirect to the first page in the group.
        if (pageSlug) {
            dispatch(
                interaction.actions.processInfo(
                    pageSlug,
                    `The user guide page "${pageSlug}" could not be found. Redirecting to the first page in the "${group.title}".`
                )
            );
        }
        return <Navigate to={`/user-guide/${groupSlug}/${group.pages[0].slug}`} replace />;
    }

    return (
        <div className={styles.root}>
            {/* Mobile page picker */}
            <div className={styles.mobilNav}>
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
                <DocPage group={group} page={page} />
            </div>

            <StatusMessage />
        </div>
    );
}
