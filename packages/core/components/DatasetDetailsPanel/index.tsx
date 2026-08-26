import classNames from "classnames";
import * as React from "react";
import { useDispatch, useSelector } from "react-redux";

import DatasetDetailsRow from "./DatasetDetailsRow";
import { SecondaryButton, TertiaryButton } from "../Buttons";
import MarkdownText from "../MarkdownText";
import useCheckOverflowScroll from "../../hooks/useCheckOverflowScroll";
import { interaction } from "../../state";

import styles from "./DatasetDetails.module.css";

interface DatasetDetailsProps {
    className?: string;
    datasetDetails?: DatasetDetail[];
    description?: string;
    title?: string;
    isLoading?: boolean;
}

export interface DatasetDetail {
    label: string;
    value: string;
    link?: string;
}

/**
 * Right-side panel for displaying dataset information
 * @param datasetDetails    An array of DatasetDetail objects; each entry is a piece of metadata
 * @param children  Button overrides that appear below the title, e.g., on the Open-source datasets page
 */
export default function DatasetDetailsPanel(props: React.PropsWithChildren<DatasetDetailsProps>) {
    const { children, datasetDetails, isLoading } = props;
    const dispatch = useDispatch();
    const [scrollRef, hasScroll] = useCheckOverflowScroll<HTMLDivElement>();

    const isDetailsPanelVisible = useSelector(interaction.selectors.getDatasetDetailsVisibility);
    const [showLongDescription, setShowLongDescription] = React.useState(false);
    const isLongDescription: boolean = React.useMemo(() => {
        if (!props.description) {
            return false;
        }
        // Allow slightly longer than 5 lines
        return props.description.length > 280;
    }, [props.description]);

    const content: JSX.Element | JSX.Element[] | null = React.useMemo(() => {
        if (!!isLoading) return <div>Loading...</div>;
        if (!datasetDetails) return null;
        return datasetDetails.map((field) => {
            return (
                <DatasetDetailsRow
                    key={field.label}
                    className={styles.row}
                    name={field.label}
                    value={field.value}
                    link={field.link || undefined}
                />
            );
        });
    }, [datasetDetails, isLoading]);

    const toggleDescriptionButton = (
        <a className={styles.link} onClick={() => setShowLongDescription(!showLongDescription)}>
            Read {showLongDescription ? "less" : "more"}
        </a>
    );

    return (
        <div
            className={classNames(styles.panel, props.className, {
                [styles.hidden]: !isDetailsPanelVisible,
            })}
        >
            <div className={styles.internalWrapper}>
                <div className={styles.header}>
                    <div className={styles.title}>{props?.title}</div>
                    <TertiaryButton
                        iconName="Cancel"
                        title="Close"
                        onClick={() => dispatch(interaction.actions.hideDatasetDetailsPanel())}
                    />
                </div>
                {children}
                <hr className={styles.divider}></hr>
                <div className={styles.overflowContainer} ref={scrollRef}>
                    <div className={styles.content}>
                        <div
                            className={classNames({
                                [styles.descriptionTruncated]:
                                    !showLongDescription && isLongDescription,
                            })}
                        >
                            {/* Attempt to render user-provided descriptions as markdown formatting */}
                            <MarkdownText text={props?.description}></MarkdownText>
                        </div>
                        {isLongDescription && toggleDescriptionButton}
                        <div className={styles.list}>{content}</div>
                    </div>
                </div>
                {hasScroll && <div className={styles.verticalGradient} />}
                <div className={styles.footer}>
                    <SecondaryButton
                        className={styles.secondaryCloseButton}
                        title="Close panel"
                        text="CLOSE"
                        onClick={() => dispatch(interaction.actions.hideDatasetDetailsPanel())}
                    />
                </div>
            </div>
        </div>
    );
}
