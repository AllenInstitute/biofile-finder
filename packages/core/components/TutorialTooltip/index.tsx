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
    const tutorials = useSelector(selection.selectors.getTutorials);
    const [tutorialStepIndex, setTutorialStepIndex] = React.useState(0);
    const [currentTopicIndex, setCurrentTopicIndex] = React.useState(0);
    const currentTopic = React.useMemo(() => {
        return tutorials?.[currentTopicIndex];
    }, [tutorials, currentTopicIndex]);

    if (!tutorials || !currentTopic) {
        return null;
    }
    const resetToFirstStep = () => {
        setTutorialStepIndex(0);
        return currentTopic.getStep(0);
    };

    const nextStepIndex = tutorialStepIndex + 1;
    const previousStepIndex = tutorialStepIndex - 1;
    // If switching from another tooltip, may be out of index range and should reset
    const currentTutorialStep = currentTopic.hasStep(tutorialStepIndex)
        ? currentTopic.getStep(tutorialStepIndex)
        : resetToFirstStep();

    // Call as needed instead of re-rendering
    const hasMoreTopics = () => currentTopicIndex < tutorials.length - 1;
    const hasPreviousTopics = () => currentTopicIndex > 0;

    const onDismiss = () => {
        setCurrentTopicIndex(0);
        setTutorialStepIndex(0);
        dispatch(selection.actions.selectTutorial(undefined));
    };

    const selectNextTutorial = () => {
        if (currentTopic.hasStep(nextStepIndex)) {
            setTutorialStepIndex(nextStepIndex);
        } else if (hasMoreTopics()) {
            setCurrentTopicIndex(currentTopicIndex + 1);
            setTutorialStepIndex(0);
        } else {
            onDismiss();
        }
    };

    const selectPreviousTutorial = () => {
        if (currentTopic?.hasStep(previousStepIndex)) {
            setTutorialStepIndex(previousStepIndex);
        }
        // Go back to the last step of the previous topic
        else if (hasPreviousTopics()) {
            const previousIndex = currentTopicIndex - 1;
            setCurrentTopicIndex(previousIndex);
            // use indexing on const rather than currentTopic since state is currently being mutated
            setTutorialStepIndex(tutorials[previousIndex].length - 1);
        } // else do nothing, should be disabled
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
                <h4>{currentTopic.title}</h4>
                <IconButton
                    className={styles.clearButton}
                    iconProps={{ iconName: "Clear" }}
                    onClick={onDismiss}
                />
            </div>
            <p>{currentTutorialStep.message}</p>
            <div className={styles.buttonFooter}>
                <h6>
                    {tutorialStepIndex + 1} / {currentTopic.length}
                </h6>
                <div className={styles.stepButtons}>
                    <TertiaryButton
                        className={classNames(
                            {
                                [styles.disabled]:
                                    !currentTopic.hasStep(previousStepIndex) &&
                                    !hasPreviousTopics(),
                            },
                            styles.tutorialStepButton
                        )}
                        disabled={!currentTopic.hasStep(previousStepIndex) && !hasPreviousTopics()}
                        iconName="CaretSolidLeft"
                        onClick={selectPreviousTutorial}
                        title="Previous step"
                        id="tutorial-prev"
                    />
                    <TertiaryButton
                        className={classNames(
                            {
                                [styles.biggerIcon]: !currentTopic.hasStep(nextStepIndex),
                            },
                            styles.tutorialStepButton
                        )}
                        iconName={
                            currentTopic.hasStep(nextStepIndex) || hasMoreTopics()
                                ? "CaretSolidRight"
                                : "Checkmark"
                        }
                        onClick={selectNextTutorial}
                        title={
                            currentTopic.hasStep(nextStepIndex) || hasMoreTopics()
                                ? "Next step"
                                : "Finished"
                        }
                        id="tutorial-next"
                    />
                </div>
            </div>
        </TeachingBubble>
    );
}
