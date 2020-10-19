import Tippy from "@tippy.js/react";
import classNames from "classnames";
import { IconButton, TextField, TooltipHost } from "office-ui-fabric-react";
import * as React from "react";
import { useDispatch, useSelector } from "react-redux";

import getContextMenuItems from "../ContextMenu/items";
import { ERROR_ICON_PATH_DATA } from "../DirectoryTree/DirectoryTreeNodeHeader";
import SvgIcon from "../../components/SvgIcon";
import FileExplorerURL from "../../entity/FileExplorerURL";
import { interaction, metadata, selection } from "../../state";

const styles = require("./FileExplorerURLBar.module.css");

interface FileExplorerURLBarProps {
    className?: string;
}

/**
 * URL bar at the top of the application responsible for allowing the copy & paste
 * of FileExplorerURLs for the purpose of sharing queries between users.
 */
export default function FileExplorerURLBar(props: FileExplorerURLBarProps) {
    const dispatch = useDispatch();
    const annotations = useSelector(metadata.selectors.getAnnotations);
    const existingEncodedURL = useSelector(selection.selectors.getEncodedFileExplorerUrl);

    const [url, setURL] = React.useState<string>(existingEncodedURL);
    const [isCopied, setCopied] = React.useState(false);
    const error = React.useMemo(
        () => FileExplorerURL.validateEncodedFileExplorerURL(url, annotations),
        [url, annotations]
    );

    // Update URL bar (even if input exists) if the state changes enough to change what would be encoded there
    React.useEffect(() => {
        setURL(existingEncodedURL);
    }, [existingEncodedURL]);

    const onCopy = () => {
        setCopied(true);
        setTimeout(() => {
            setCopied(false);
        }, 4000);
        navigator.clipboard.writeText(url || existingEncodedURL);
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
        if (url !== existingEncodedURL && !error) {
            dispatch(selection.actions.decodeFileExplorerURL(url));
        }
    };

    return (
        <div className={classNames(styles.container, props.className)}>
            <form className={styles.urlForm} onSubmit={onSubmit}>
                <TextField
                    borderless
                    prefix={"FMS File Explorer URL"}
                    defaultValue={existingEncodedURL}
                    onChange={(_, value) => setURL(value || "")}
                    value={url}
                    spellCheck={false}
                    onContextMenu={onContextMenu}
                />
            </form>
            {!error ? (
                <TooltipHost content={isCopied ? "Copied to clipboard!" : undefined}>
                    <IconButton
                        className={styles.copyButton}
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
