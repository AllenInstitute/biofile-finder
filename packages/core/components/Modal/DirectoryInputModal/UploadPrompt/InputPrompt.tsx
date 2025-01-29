import * as React from 'react';

import { Files } from '../Upload';
import { SecondaryButton } from '../../../Buttons';

import styles from "./InputPrompt.module.css";

interface Props {
    onSelectInput: (files: Files) => void;
}

/**
 * TODO
 */
export default function InputPrompt(props: Props) {
    const [isLoading, setIsLoading] = React.useState(false);

    if (isLoading) {
        return (
            <p>Loading...</p>
        );
    }

    const onChooseInputFile = (evt: React.FormEvent<HTMLInputElement>) => {
        const selectedFile = (evt.target as HTMLInputElement).files?.[0];
        if (selectedFile) {
            setIsLoading(true);
            // TODO: Could we do some sort of polling mechanism???
            // Grab the contents of the input file
            // const filesToUpload: any[] = [];
            // const filesToUpdate: any[] = [];
            props.onSelectInput({ filesToUpload: [0], filesToUpdate: [], filesCompleted: [] });
            setIsLoading(false);
        }
    };

    return (
        <form>
            <label
                aria-label="Browse for a file on your machine"
                title="Browse for a file on your machine"
                htmlFor="source-input"
            >
                <SecondaryButton
                    className={styles.middleButton}
                    iconName="DocumentSearch"
                    text="Choose file"
                    title="Choose file"
                />
            </label>
            <input
                hidden
                accept=".csv,.json,.parquet"
                type="file"
                id="source-input"
                name="source-input"
                onChange={onChooseInputFile}
            />
        </form>
    );
}