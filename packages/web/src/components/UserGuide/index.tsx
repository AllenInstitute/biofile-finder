import * as React from "react";
import { Navigate, useLocation, useParams } from "react-router-dom";

import { PrimaryButton } from "../../../../core/components/Buttons";
import DocPage from "./DocPage";
import Sidebar from "./Sidebar";
import styles from "./UserGuide.module.css";

export default function UserGuide() {
    const { sectionSlug, pageSlug } = useParams<{
        sectionSlug: string;
        pageSlug: string;
    }>();
    const location = useLocation();
    const [menuOpen, setMenuOpen] = React.useState(false);
    const contentRef = React.useRef<HTMLDivElement>(null);

    React.useEffect(() => {
        setMenuOpen(false);
        if (contentRef.current) {
            contentRef.current.scrollTop = 0;
        }
    }, [location.pathname]);

    if (!sectionSlug || !pageSlug) {
        return <Navigate to="/user-guide/about/overview" replace />;
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
                            <Sidebar activeSectionSlug={sectionSlug} activePageSlug={pageSlug} />
                        </div>
                    </>
                )}
            </div>

            {/* Desktop sidebar */}
            <aside className={styles.sidebar}>
                <Sidebar activeSectionSlug={sectionSlug} activePageSlug={pageSlug} />
            </aside>

            {/* Main content */}
            <div ref={contentRef} className={styles.content}>
                <DocPage sectionSlug={sectionSlug} pageSlug={pageSlug} />
            </div>
        </div>
    );
}
