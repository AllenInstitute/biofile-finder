import { Icon } from "@fluentui/react";
import classNames from "classnames";
import { kebabCase } from "lodash";
import * as React from "react";
import { Link } from "react-router-dom";

import { CONTENT, NavigationGroup, Page } from "./content";
import { userGuidePath } from "./paths";

import styles from "./DocPage.module.css";

// Flattened, in-order list of every page across all groups, used to find the
// previous/next page for pagination.
const ALL_PAGES = CONTENT.flatMap((group) => group.pages.map((page) => ({ group, page })));

interface DocPageProps {
    group: NavigationGroup;
    page: Page;
}

export default function DocPage({ group, page }: DocPageProps) {
    const idx = ALL_PAGES.findIndex(
        (p) => p.group.slug === group.slug && p.page.slug === page.slug
    );
    const prev = idx > 0 ? ALL_PAGES[idx - 1] : null;
    const next = idx >= 0 && idx < ALL_PAGES.length - 1 ? ALL_PAGES[idx + 1] : null;

    return (
        <article className={styles.root}>
            <nav className={styles.breadcrumb} aria-label="breadcrumb">
                <span className={styles.breadcrumbSection}>{group.title}</span>
                <Icon iconName="ChevronRight" className={styles.breadcrumbSeparator} />
                <span className={styles.breadcrumbPage}>{page.title}</span>
            </nav>
            <h1 className={styles.title}>{page.title}</h1>
            {page.intro && <p className={styles.intro}>{page.intro}</p>}
            <div className={styles.sections}>
                {page.sections.map((sec, idx) => {
                    const HeadingTag = `h${sec.level ?? 2}` as "h2" | "h3" | "h4";
                    return (
                        <section
                            key={`${sec.heading}${idx}`}
                            id={sec.heading ? kebabCase(sec.heading) : undefined}
                            className={styles.section}
                        >
                            {sec.heading && (
                                <HeadingTag className={styles.sectionHeading}>
                                    {sec.heading}
                                </HeadingTag>
                            )}
                            <div className={styles.sectionBody}>{sec.body}</div>
                        </section>
                    );
                })}
            </div>
            <div className={styles.pagination}>
                {prev ? (
                    <Link
                        to={userGuidePath(prev.group.slug, prev.page.slug)}
                        className={classNames(styles.pageNav, styles.pageNavPrev)}
                    >
                        <Icon iconName="ChevronLeft" className={styles.pageNavIcon} />
                        <div>
                            <div className={styles.pageNavLabel}>Previous</div>
                            <div className={styles.pageNavTitle}>{prev.page.title}</div>
                        </div>
                    </Link>
                ) : (
                    <div />
                )}
                {next ? (
                    <Link
                        to={userGuidePath(next.group.slug, next.page.slug)}
                        className={classNames(styles.pageNav, styles.pageNavNext)}
                    >
                        <div>
                            <div className={styles.pageNavLabel}>Next</div>
                            <div className={styles.pageNavTitle}>{next.page.title}</div>
                        </div>
                        <Icon iconName="ChevronRight" className={styles.pageNavIcon} />
                    </Link>
                ) : (
                    <div />
                )}
            </div>
        </article>
    );
}
