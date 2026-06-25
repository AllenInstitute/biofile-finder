import { Icon } from "@fluentui/react";
import classNames from "classnames";
import * as React from "react";
import { Link } from "react-router-dom";

import { PAGE_CONTENT } from "./content/index";
import {
    NavSection,
    getAdjacentPages,
    type UserGuidePageKey,
} from "./nav";
import styles from "./DocPage.module.css";

interface DocPageProps {
    section: NavSection;
    pageKey: UserGuidePageKey;
}

export default function DocPage({ section, pageKey }: DocPageProps) {
    const content = PAGE_CONTENT[pageKey];
    const { prev, next } = getAdjacentPages(pageKey);

    if (!content) {
        return (
            <div className={styles.notFound}>
                <p>Page not found.</p>
            </div>
        );
    }

    return (
        <article className={styles.root}>
            <nav className={styles.breadcrumb} aria-label="breadcrumb">
                <span className={styles.breadcrumbSection}>{section.title}</span>
                <Icon iconName="ChevronRight" className={styles.breadcrumbSeparator} />
                <span className={styles.breadcrumbPage}>{content.title}</span>
            </nav>
            <h1 className={styles.title}>{content.title}</h1>
            {content.intro && <p className={styles.intro}>{content.intro}</p>}
            <div className={styles.sections}>
                {content.sections.map((sec) => {
                    const HeadingTag = `h${sec.level ?? 2}` as "h2" | "h3" | "h4";
                    return (
                        <section key={sec.id} id={sec.id} className={styles.section}>
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
                        to={`/user-guide/${prev.section.slug}/${prev.page.slug}`}
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
                        to={`/user-guide/${next.section.slug}/${next.page.slug}`}
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
