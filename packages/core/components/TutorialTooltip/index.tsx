import { IconButton, TeachingBubble } from "@fluentui/react";
import classNames from "classnames";
import * as React from "react";
import { useDispatch, useSelector } from "react-redux";

import { TertiaryButton } from "../Buttons";
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
    const resetToFirstStep = () => {
        setTutorialStepIndex(0);
        return tutorial.getStep(0);
    };

    const nextStepIndex = tutorialStepIndex + 1;
    const previousStepIndex = tutorialStepIndex - 1;
    // If switching from another tooltip, may be out of index range and should reset
    const currentTutorialStep = tutorial.hasStep(tutorialStepIndex)
        ? tutorial.getStep(tutorialStepIndex)
        : resetToFirstStep();

    const onDismiss = () => {
        setTutorialStepIndex(0);
        dispatch(selection.actions.selectTutorial(undefined));
    };

    const selectNextTutorial = () => {
        if (tutorial.hasStep(nextStepIndex)) {
            setTutorialStepIndex(nextStepIndex);
        } else {
            onDismiss();
        }
    };

    return (
        <TeachingBubble
            isWide
            target={`#${currentTutorialStep.targetId}`}
            calloutProps={{
                className: styles.tutorialContainer,
                minPagePadding: 50, // Prevent tutorial cutoff for small screens
            }}
            focusTrapZoneProps={{ disabled: true }}
        >
            <div className={styles.header}>
                <h4>Tutorial: {tutorial.title}</h4>
                <IconButton
                    className={styles.clearButton}
                    iconProps={{ iconName: "Clear" }}
                    onClick={onDismiss}
                />
            </div>
            <p>{currentTutorialStep.message}</p>
            <div className={styles.buttonFooter}>
                <h6>
                    {tutorialStepIndex + 1} / {tutorial.length}
                </h6>
                <div className={styles.stepButtons}>
                    <TertiaryButton
                        className={classNames(
                            {
                                [styles.disabled]: !tutorial.hasStep(previousStepIndex),
                            },
                            styles.tutorialStepButton
                        )}
                        disabled={!tutorial.hasStep(previousStepIndex)}
                        iconName="CaretSolidLeft"
                        onClick={() => setTutorialStepIndex(previousStepIndex)}
                        title="Previous step"
                        id="tutorial-prev"
                    />
                    <TertiaryButton
                        className={classNames(
                            {
                                [styles.biggerIcon]: !tutorial.hasStep(nextStepIndex),
                            },
                            styles.tutorialStepButton
                        )}
                        iconName={tutorial.hasStep(nextStepIndex) ? "CaretSolidRight" : "Checkmark"}
                        onClick={selectNextTutorial}
                        title={tutorial.hasStep(nextStepIndex) ? "Next step" : "Finished"}
                        id="tutorial-next"
                    />
                </div>
            </div>
        </TeachingBubble>
    );
}
