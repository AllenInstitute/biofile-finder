import { TextField } from "@fluentui/react";
import * as React from "react";
import { useDispatch, useSelector } from "react-redux";

import { ModalProps } from "..";
import BaseModal from "../BaseModal";
import { PrimaryButton, SecondaryButton } from "../../Buttons";
import TinyUrlService from "../../../services/TinyUrlService";
import { interaction, selection } from "../../../state";

import styles from "./ShareableLink.module.css";

// Instantiated once at module level since the token is a build-time constant.
const tinyUrlService = process.env.TINYURL_API_TOKEN
    ? new TinyUrlService(process.env.TINYURL_API_TOKEN)
    : null;

/**
 * Dialog for copying a shareable link to the current query.
 * When a TinyURL token is configured, the link is shortened and a custom
 * alias (optional) can be provided. Shortened links expire after 1 week.
 */
export default function ShareableLink({ onDismiss }: ModalProps) {
    const dispatch = useDispatch();
    const encodedSearchParams = useSelector(selection.selectors.getEncodedSearchParams);

    const fullUrl = React.useMemo(
        () => `${window.location.origin}/app?${encodedSearchParams}`,
        [encodedSearchParams]
    );

    const [alias, setAlias] = React.useState("");
    const [isCopying, setIsCopying] = React.useState(false);
    const [errorMsg, setErrorMsg] = React.useState<string | null>(null);

    const onCopy = async () => {
        setErrorMsg(null);
        setIsCopying(true);
        try {
            let urlToCopy = fullUrl;
            if (tinyUrlService) {
                urlToCopy = await tinyUrlService.shorten(fullUrl, {
                    alias: alias.trim() || undefined,
                });
            }
            await navigator.clipboard.writeText(urlToCopy);
            dispatch(
                interaction.actions.processSuccess("linkCopySuccess", "Link copied to clipboard!")
            );
            onDismiss();
        } catch (err) {
            setErrorMsg((err as Error).message);
        } finally {
            setIsCopying(false);
        }
    };

    const body = (
        <div className={styles.container}>
            <p className={styles.urlPreview}>{fullUrl}</p>
            {tinyUrlService && (
                <>
                    <p className={styles.description}>
                        The link will be shortened via TinyURL and will expire in 1 week. You may
                        optionally specify a custom alias for the short URL.
                    </p>
                    <TextField
                        className={styles.aliasInput}
                        label="Custom alias (optional)"
                        placeholder="e.g. my-dataset-2024"
                        value={alias}
                        onChange={(_, newValue) => {
                            setAlias(newValue ?? "");
                            setErrorMsg(null);
                        }}
                        prefix="tinyurl.com/"
                        disabled={isCopying}
                    />
                    {errorMsg && <p className={styles.error}>{errorMsg}</p>}
                </>
            )}
        </div>
    );

    const footer = (
        <div className={styles.footer}>
            <SecondaryButton title="" text="Cancel" onClick={onDismiss} disabled={isCopying} />
            <PrimaryButton
                title=""
                text={isCopying ? "Copying..." : "Copy Link"}
                onClick={onCopy}
                disabled={isCopying}
            />
        </div>
    );

    return (
        <BaseModal
            body={body}
            footer={footer}
            onDismiss={onDismiss}
            title="Copy Shareable Link"
        />
    );
}
