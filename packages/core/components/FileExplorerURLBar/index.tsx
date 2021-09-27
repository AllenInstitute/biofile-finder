import Tippy from "@tippy.js/react";
import classNames from "classnames";
import { debounce } from "lodash";
import { IconButton, TextField, TooltipHost } from "@fluentui/react";
import * as React from "react";
import { useDispatch, useSelector } from "react-redux";

import getContextMenuItems from "../ContextMenu/items";
import SvgIcon from "../../components/SvgIcon";
import FileExplorerURL from "../../entity/FileExplorerURL";
import { ERROR_ICON_PATH_DATA } from "../../icons";
import { interaction, metadata, selection } from "../../state";

const styles = require("./FileExplorerURLBar.module.css");

interface FileExplorerURLBarProps {
    className?: string;
    key: string;
    existingEncodedURL: string;
}

/**
 * URL bar at the top of the application responsible for allowing the copy & paste
 * of FileExplorerURLs for the purpose of sharing queries between users.
 */
function FileExplorerURLBar(props: FileExplorerURLBarProps) {
    const dispatch = useDispatch();
    const annotations = useSelector(metadata.selectors.getAnnotations);
    const datasetService = useSelector(interaction.selectors.getDatasetService);

    const [url, setURL] = React.useState<string>(props.existingEncodedURL);
    const [isCopied, setCopied] = React.useState(false);
    const [error, setError] = React.useState<string>();
    const [isLoading, setLoading] = React.useState(false);

    // Check for valid URL
    React.useEffect(() => {
        setLoading(true);
        async function checkUrl() {
            const err = await FileExplorerURL.validateEncodedFileExplorerURL(
                url,
                annotations,
                datasetService
            );
            setError(err);
            setLoading(false);
        }
        checkUrl();
    }, [url, annotations, datasetService]);

    const onURLChange = (_: React.FormEvent, input?: string) => {
        setURL(input || "");
        // If the user previously copied the URL to their clipboard, this is no longer true after changing the URL
        if (isCopied) {
            setCopied(false);
        }
    };

    const onRefresh = debounce(
        () => {
            setURL(props.existingEncodedURL);
            dispatch(interaction.actions.refresh());
        },
        1000,
        { leading: true, trailing: false }
    );

    const onCopy = () => {
        navigator.clipboard.writeText(url);
        // Set copied to true so we know to display tooltip feedback awknowledging the copy success
        setCopied(true);
    };

    const onContextMenu = (evt: React.MouseEvent) => {
        const availableItems = getContextMenuItems(dispatch);
        const items = [
            {
                ...availableItems.COPY,
                title: "Copy FMS File Explorer URL to clipboard",
                onClick: onCopy,
            },
            {
                ...availableItems.PASTE,
                title: "Paste FMS File Explorer URL from clipboard",
                onClick: async () => {
                    const clipboardText = await navigator.clipboard.readText();
                    setURL(clipboardText);
                },
            },
        ];
        dispatch(interaction.actions.showContextMenu(items, evt.nativeEvent));
    };

    const onSubmit = (evt: React.FormEvent) => {
        evt.preventDefault();
        if (url !== props.existingEncodedURL && !error) {
            dispatch(selection.actions.decodeFileExplorerURL(url));
        }
    };

    return (
        <div className={classNames(styles.container, props.className)}>
            <form className={styles.urlForm} onSubmit={onSubmit}>
                <TextField
                    borderless
                    disabled={isLoading}
                    prefix={"FMS File Explorer URL"}
                    onChange={onURLChange}
                    value={url}
                    spellCheck={false}
                    onContextMenu={onContextMenu}
                    data-testid="fms-file-explorer-url-bar"
                />
            </form>
            <IconButton
                className={styles.button}
                iconProps={{ iconName: "refresh" }}
                onClick={onRefresh}
                data-testid="refresh-button"
            />
            {!error ? (
                <TooltipHost content={isCopied ? "Copied to clipboard!" : undefined}>
                    <IconButton
                        className={styles.button}
                        iconProps={{ iconName: "link" }}
                        onClick={onCopy}
                    />
                </TooltipHost>
            ) : (
                <Tippy content={`This could not be verified as a File Explorer URL. ${error}`}>
                    <SvgIcon
                        className={styles.errorIcon}
                        height={15}
                        pathData={ERROR_ICON_PATH_DATA}
                        viewBox="0 0 24 24"
                        width={15}
                    />
                </Tippy>
            )}
        </div>
    );
}

/**
 * Wrapper to the FileExplorerURLBar component to allow React to replace the component
 * everytime the the encoded URL changes rather than updating the selector itself.
 * This is to avoid having to manually reset the input state, an anti-pattern in React.
 * See https://reactjs.org/blog/2018/06/07/you-probably-dont-need-derived-state.html#anti-pattern-unconditionally-copying-props-to-state
 * "Recommendation: Fully uncontrolled component with a key"
 */
export default function FileExplorerURLBarWrapper(props: { className?: string }) {
    const existingEncodedURL = useSelector(selection.selectors.getEncodedFileExplorerUrl);
    return (
        <FileExplorerURLBar
            className={props.className}
            key={existingEncodedURL}
            existingEncodedURL={existingEncodedURL}
        />
    );
}
