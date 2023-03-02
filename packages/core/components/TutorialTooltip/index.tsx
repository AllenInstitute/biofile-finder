import { IconButton, TeachingBubble } from "@fluentui/react";
import classNames from "classnames";
import * as React from "react";
import { useDispatch, useSelector } from "react-redux";

import { selection } from "../../state";

import styles from "./TutorialTooltip.module.css";

/**
 * Component responsible for responding to and displaying the current tutorial
 * selected in the redux state.
 */
export default function TutorialTooltip() {
    const dispatch = useDispatch();
    const tutorial = useSelector(selection.selectors.getTutorial);
    const [tutorialStepIndex, setTutorialStepIndex] = React.useState(0);
    if (!tutorial) {
        return null;
    }

    const nextStepIndex = tutorialStepIndex + 1;
    const previousStepIndex = tutorialStepIndex - 1;
    const currentTutorialStep = tutorial.getStep(tutorialStepIndex);

    const selectNextTutorial = () => {
        if (tutorial.hasStep(nextStepIndex)) {
            setTutorialStepIndex(nextStepIndex);
        } else {
            setTutorialStepIndex(0);
            dispatch(selection.actions.selectTutorial(undefined));
        }
    };

    return (
        <TeachingBubble
            target={`#${currentTutorialStep.targetId}`}
            styles={{
                root: {
                    className: styles.tutorialContainer,
                    " div": {
                        // Equivalent to --primary-brand-purple defined in App.module.css
                        backgroundColor: "#827aa3",
                        color: "white",
                    },
                },
            }}
        >
            <div className={styles.header}>
                <h4>Tutorial: {tutorial.title}</h4>
                <h6>
                    {tutorialStepIndex + 1} / {tutorial.length}
                </h6>
            </div>
            <p>{currentTutorialStep.message}</p>
            <div className={styles.buttonFooter}>
                <IconButton
                    className={classNames(
                        {
                            [styles.disabled]: !tutorial.hasStep(previousStepIndex),
                        },
                        styles.tutorialStepButton
                    )}
                    disabled={!tutorial.hasStep(previousStepIndex)}
                    iconProps={{ iconName: "CaretSolidLeft" }}
                    onClick={() => setTutorialStepIndex(previousStepIndex)}
                    title="Previous step"
                />
                <IconButton
                    className={classNames(
                        {
                            [styles.biggerIcon]: !tutorial.hasStep(nextStepIndex),
                        },
                        styles.tutorialStepButton
                    )}
                    iconProps={{
                        iconName: tutorial.hasStep(nextStepIndex) ? "CaretSolidRight" : "Checkmark",
                    }}
                    onClick={selectNextTutorial}
                    title={tutorial.hasStep(nextStepIndex) ? "Next step" : "Finished"}
                />
            </div>
        </TeachingBubble>
    );
}
