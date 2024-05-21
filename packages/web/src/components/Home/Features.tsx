import classNames from "classnames";
import * as React from "react";

import { Feature, features } from "./FeatureOptions";

import styles from "./Features.module.css";

// Placeholder for the splash page
export default function Features() {
    const [caption, setCaption] = React.useState<string>(features[0].caption);
    // FluentUI v8 doesn't have a tab component, so enforcing active state manually
    const [activeId, setActiveId] = React.useState(1);

    const setRightPanel = (feature: Feature) => {
        setActiveId(feature.id);
        setCaption(feature.caption);
    };

    return (
        <div className={styles.flexContainer}>
            <div className={styles.features}>
                {features.map((feature) => (
                    <button
                        className={classNames({
                            [styles.selectedFeature]: activeId === feature.id,
                        })}
                        onClick={() => setRightPanel(feature)}
                        role="tab"
                        aria-selected={activeId === feature.id}
                        key={`feature-${feature.id}`}
                    >
                        {feature.text}
                    </button>
                ))}
            </div>
            <div className={styles.carousel}>
                {caption}
                <div className={styles.carouselImage} />
            </div>
        </div>
    );
}
