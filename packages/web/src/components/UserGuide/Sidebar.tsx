import { Icon } from "@fluentui/react";
import classNames from "classnames";
import * as React from "react";
import { Link } from "react-router-dom";

import { NAV } from "./nav";
import styles from "./Sidebar.module.css";

interface SidebarProps {
    activeSectionSlug: string;
    activePageSlug: string;
}

export default function Sidebar({ activeSectionSlug, activePageSlug }: SidebarProps) {
    const [openSections, setOpenSections] = React.useState<Set<string>>(
        () => new Set([activeSectionSlug])
    );

    const toggleSection = (slug: string) => {
        setOpenSections((prev) => {
            const next = new Set(prev);
            if (next.has(slug)) {
                next.delete(slug);
            } else {
                next.add(slug);
            }
            return next;
        });
    };

    // When active section changes (navigating), ensure it opens
    React.useEffect(() => {
        setOpenSections((prev) => {
            if (prev.has(activeSectionSlug)) return prev;
            return new Set([...prev, activeSectionSlug]);
        });
    }, [activeSectionSlug]);

    return (
        <nav className={styles.root} aria-label="User guide navigation">
            <h3 className={styles.label}>User guide</h3>
            {NAV.map((section) => {
                const isOpen = openSections.has(section.slug);
                return (
                    <div key={section.slug} className={styles.section}>
                        <button
                            className={styles.sectionTitle}
                            onClick={() => toggleSection(section.slug)}
                            aria-expanded={isOpen}
                        >
                            <span>{section.title}</span>
                            <Icon
                                iconName="ChevronDown"
                                className={classNames(styles.chevron, {
                                    [styles.chevronOpen]: isOpen,
                                })}
                            />
                        </button>
                        {isOpen && (
                            <ul className={styles.pageList}>
                                {section.pages.map((page) => {
                                    const isActive =
                                        section.slug === activeSectionSlug &&
                                        page.slug === activePageSlug;
                                    return (
                                        <li key={page.slug}>
                                            <Link
                                                to={`/user-guide/${section.slug}/${page.slug}`}
                                                className={classNames(styles.pageLink, {
                                                    [styles.activePage]: isActive,
                                                })}
                                            >
                                                {page.title}
                                            </Link>
                                        </li>
                                    );
                                })}
                            </ul>
                        )}
                    </div>
                );
            })}
        </nav>
    );
}
