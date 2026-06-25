import { Icon } from "@fluentui/react";
import classNames from "classnames";
import * as React from "react";
import { Link } from "react-router-dom";

import { NavigationGroup, Page } from "./content";
import { getAdjacentPages } from "./nav";
import slugify from "./slugify";

import styles from "./DocPage.module.css";

interface DocPageProps {
    group: NavigationGroup;
    page: Page;
}

export default function DocPage({ group, page }: DocPageProps) {
    const { prev, next } = getAdjacentPages(group, page);

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
                            id={slugify(sec.heading ?? "")}
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
                        to={`/user-guide/${prev.group.slug}/${prev.page.slug}`}
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
                        to={`/user-guide/${next.group.slug}/${next.page.slug}`}
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
