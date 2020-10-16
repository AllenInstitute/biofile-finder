import classNames from "classnames";
import { IconButton, TextField } from "office-ui-fabric-react";
import * as React from "react";
import { useDispatch, useSelector } from "react-redux";

import FileExplorerURL from "../../entity/FileExplorerURL";
import { metadata, selection } from "../../state";

const styles = require("./FileExplorerURLBar.module.css");

interface FileExplorerURLBarProps {
    className?: string;
}

/**
 * TODO
 */
export default function FileExplorerURLBar(props: FileExplorerURLBarProps) {
    const dispatch = useDispatch();
    const annotations = useSelector(metadata.selectors.getAnnotations);
    const existingEncodedURL = useSelector(selection.selectors.getEncodedFileExplorerUrl);

    const [url, setURL] = React.useState<string>();

    // Update URL bar (even if input exists) if the state changes enough to change what would be encoded there
    React.useEffect(() => {
        setURL(existingEncodedURL);
    }, [existingEncodedURL]);

    // TODO: On enter
    const decodeInput = () => {
        if (url && url !== existingEncodedURL) {
            console.log("Dispatching url" + url);
            dispatch(selection.actions.decodeFileExplorerURL(url));
        }
    };

    const validateURL = (encodedURL: string) => {
        const errorMessage = FileExplorerURL.validateEncodedFileExplorerURL(
            encodedURL,
            annotations
        );
        if (errorMessage) {
            return `This could not be verified as a File Explorer URL. ${errorMessage}`;
        }
        return "";
    };
    const validationErrorMessage = url ? validateURL(url) : undefined;

    const copyUrl = () => {
        // TODO: Tell user when it has copied to their clipboard
        navigator.clipboard.writeText(url || existingEncodedURL);
    };

    return (
        <div
            className={classNames(
                styles.container,
                {
                    [styles.containerWithError]: validationErrorMessage,
                },
                props.className
            )}
        >
            <TextField
                borderless
                className={styles.url}
                errorMessage={validationErrorMessage}
                prefix={"FMS File Explorer URL"}
                defaultValue={existingEncodedURL}
                onChange={(_, value) => setURL(value)}
                value={url}
                spellCheck={false}
            />
            <IconButton
                className={styles.link}
                disabled={Boolean(validationErrorMessage)}
                iconProps={{ iconName: "link" }}
                onClick={copyUrl}
            />
        </div>
    );
}
