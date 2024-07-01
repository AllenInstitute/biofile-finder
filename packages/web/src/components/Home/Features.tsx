import classNames from "classnames";
import * as React from "react";

import FEATURE_OPTIONS from "./FeatureOptions";

import styles from "./Features.module.css";

/**
 * Component responsible for rendering the features section of the home page.
 */
export default function Features() {
    const [{ activeFeatureIndex, activeSlideIndex }, setActiveSlideIndices] = React.useState({
        activeFeatureIndex: 0,
        activeSlideIndex: 0,
    });
    const activeFeature = FEATURE_OPTIONS[activeFeatureIndex];
    const activeSlide = activeFeature.slides[activeSlideIndex];

    const changeFeature = React.useCallback(
        (featureIndex: number, slideIndex = 0) => {
            if (activeFeatureIndex > FEATURE_OPTIONS.length - 1) {
                throw new Error("Invalid feature index");
            }

            setActiveSlideIndices({
                activeFeatureIndex: featureIndex,
                activeSlideIndex: slideIndex,
            });
        },
        [activeFeatureIndex, activeSlideIndex, setActiveSlideIndices]
    );

    React.useEffect(() => {
        const handleNextOrPrevKeyPress = (event: KeyboardEvent) => {
            const isHittingNext = event.key === "ArrowRight";
            const isHittingPrev = event.key === "ArrowLeft";

            if (isHittingNext) {
                const hasNextSlide = activeSlideIndex < activeFeature.slides.length - 1;
                const hasNextFeature = activeFeatureIndex < FEATURE_OPTIONS.length - 1;

                if (hasNextSlide) {
                    changeFeature(activeFeatureIndex, activeSlideIndex + 1);
                } else if (hasNextFeature) {
                    changeFeature(activeFeatureIndex + 1);
                }
            } else if (isHittingPrev) {
                const hasPrevSlide = activeSlideIndex > 0;
                const hasPrevFeature = activeFeatureIndex > 0;

                if (hasPrevSlide) {
                    changeFeature(activeFeatureIndex, activeSlideIndex - 1);
                } else if (hasPrevFeature) {
                    const newFeatureIndex = activeFeatureIndex - 1;
                    changeFeature(
                        newFeatureIndex,
                        FEATURE_OPTIONS[newFeatureIndex].slides.length - 1
                    );
                }
            }
        };

        // attach the event listener
        document.addEventListener("keydown", handleNextOrPrevKeyPress);

        // remove the event listener
        return () => {
            document.removeEventListener("keydown", handleNextOrPrevKeyPress);
        };
    }, [activeFeature, activeSlideIndex, setActiveSlideIndices, changeFeature]);

    return (
        <div className={styles.flexContainer}>
            <div className={styles.features}>
                {FEATURE_OPTIONS.map((feature, index) => (
                    <button
                        className={classNames({
                            // FluentUI v8 doesn't have a tab component, so enforcing active state manually
                            [styles.selectedFeature]: activeFeature.id === feature.id,
                        })}
                        onClick={() => changeFeature(index)}
                        role="tab"
                        aria-selected={activeFeature.id === feature.id}
                        key={`feature-${feature.id}`}
                    >
                        {feature.text}
                    </button>
                ))}
            </div>
            <div className={styles.carousel}>
                <img height={300} src="fms-file-explorer-web/assets/banner.png" />
                <div className={styles.slideButtonsContainer}>
                    {activeFeature.slides.map((_, index) => (
                        <button
                            className={classNames(styles.slideButton, {
                                [styles.selectedSlide]: activeSlideIndex === index,
                            })}
                            onClick={() => changeFeature(activeFeatureIndex, index)}
                            role="tab"
                            aria-selected={activeSlideIndex === index}
                            key={`slide-${index}`}
                        />
                    ))}
                </div>
                <p>{activeSlide.caption}</p>
            </div>
        </div>
    );
}
