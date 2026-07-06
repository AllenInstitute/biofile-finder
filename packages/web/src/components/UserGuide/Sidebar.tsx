import { Icon } from "@fluentui/react";
import classNames from "classnames";
import * as React from "react";
import { Link } from "react-router-dom";

import { CONTENT } from "./content";

import styles from "./Sidebar.module.css";

interface SidebarProps {
    activeGroupSlug?: string;
    activePageSlug?: string;
}

export default function Sidebar({ activeGroupSlug, activePageSlug }: SidebarProps) {
    const [openSections, setOpenSections] = React.useState<Set<string>>(() =>
        activeGroupSlug ? new Set([activeGroupSlug]) : new Set()
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

    // When active group changes (navigating), ensure it opens
    React.useEffect(() => {
        setOpenSections((prev) => {
            if (!activeGroupSlug) return prev;
            if (prev.has(activeGroupSlug)) return prev;
            return new Set([...prev, activeGroupSlug]);
        });
    }, [activeGroupSlug]);

    return (
        <nav className={styles.root} aria-label="User guide navigation">
            <h3 className={styles.label}>User guide</h3>
            {CONTENT.map((group) => {
                const isOpen = openSections.has(group.slug);
                return (
                    <div key={group.slug} className={styles.section}>
                        <button
                            className={styles.sectionTitle}
                            onClick={() => toggleSection(group.slug)}
                            aria-expanded={isOpen}
                        >
                            <span>{group.title}</span>
                            <Icon
                                iconName="ChevronDown"
                                className={classNames(styles.chevron, {
                                    [styles.chevronOpen]: isOpen,
                                })}
                            />
                        </button>
                        {isOpen && (
                            <ul className={styles.pageList}>
                                {group.pages.map((page) => {
                                    const isActive =
                                        group.slug === activeGroupSlug &&
                                        page.slug === activePageSlug;
                                    return (
                                        <li key={page.slug}>
                                            <Link
                                                to={`/user-guide/${group.slug}/${page.slug}`}
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
