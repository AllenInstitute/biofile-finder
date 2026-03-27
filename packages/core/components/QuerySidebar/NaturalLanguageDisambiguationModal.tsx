import * as React from "react";

import BaseModal from "../Modal/BaseModal";
import { PrimaryButton, SecondaryButton } from "../Buttons";
import Annotation from "../../entity/Annotation";

import styles from "./NaturalLanguageDisambiguationModal.module.css";

interface Props {
    matches: Annotation[];
    phrase: string;
    onCancel: () => void;
    onSelect: (annotation: Annotation) => void;
}

export default function NaturalLanguageDisambiguationModal(props: Props) {
    return (
        <BaseModal
            title="Which annotation did you mean?"
            onDismiss={props.onCancel}
            body={
                <div className={styles.body}>
                    <p className={styles.description}>
                        `{props.phrase}` matches multiple annotations. Choose the one to use for
                        this query.
                    </p>
                    <div className={styles.options}>
                        {props.matches.map((annotation) => (
                            <PrimaryButton
                                key={annotation.name}
                                className={styles.option}
                                onClick={() => props.onSelect(annotation)}
                                text={annotation.displayName}
                                title={annotation.description}
                            />
                        ))}
                    </div>
                </div>
            }
            footer={<SecondaryButton onClick={props.onCancel} text="Cancel" />}
        />
    );
}
