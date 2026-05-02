import { TextField } from "@fluentui/react";
import axios from "axios";
import { debounce } from "lodash";
import * as React from "react";
import { useDispatch, useSelector } from "react-redux";

import TinyUrlService from "./TinyUrlService";
import { ModalProps } from "..";
import BaseModal from "../BaseModal";
import { PrimaryButton, SecondaryButton } from "../../Buttons";
import ChoiceGroup from "../../ChoiceGroup";
import { interaction, selection } from "../../../state";

import styles from "./ShareableLink.module.css";

const ONE_WEEK_MS = 7 * 24 * 60 * 60 * 1000;
const ONE_MONTH_MS = 30 * 24 * 60 * 60 * 1000;
const SIX_MONTHS_MS = 180 * 24 * 60 * 60 * 1000;

const EXPIRATION_OPTIONS = [
    { key: String(ONE_WEEK_MS), text: "1 week" },
    { key: String(ONE_MONTH_MS), text: "1 month" },
    { key: String(SIX_MONTHS_MS), text: "6 months" },
];

// TODO: Validate manually that an expired URL's alias can be re-used

// Instantiated once at module level since the token is a build-time constant.
const TINY_URL_DOMAIN = "tinyurl.com"; // "link.allencell.org"; TODO: Change once we get subdomain CNAME registered
const tinyUrlService = process.env.TINYURL_API_TOKEN
    ? new TinyUrlService(process.env.TINYURL_API_TOKEN, TINY_URL_DOMAIN, axios.create())
    : null;

/**
 * Dialog for copying a shareable link to the current query.
 * When a TinyURL token is configured, the link is shortened and a custom
 * alias (optional) can be provided.
 */
export default function ShareableLink({ onDismiss }: ModalProps) {
    const dispatch = useDispatch();
    const encodedSearchParams = useSelector(selection.selectors.getEncodedSearchParams);

    const fullUrl = React.useMemo(() => `${window.location.origin}/app?${encodedSearchParams}`, [
        encodedSearchParams,
    ]);

    const [alias, setAlias] = React.useState("");
    const [expiresInMs, setExpiresInMs] = React.useState(ONE_WEEK_MS);
    const [isCopying, setIsCopying] = React.useState(false);
    const [errorMsg, setErrorMsg] = React.useState<string>();
    const [aliasErrMsg, setAliasErrMsg] = React.useState<string>();

    const validateAlias = React.useMemo(
        () =>
            debounce(async (newAlias: string) => {
                if (!tinyUrlService) return;
                try {
                    await tinyUrlService.validateAlias(newAlias);
                    setAliasErrMsg(undefined);
                } catch (err) {
                    setAliasErrMsg((err as Error).message);
                }
            }, 750),
        []
    );
    React.useEffect(() => () => validateAlias.cancel(), [validateAlias]);

    const onAliasChange = (newAlias: string) => {
        setAlias(newAlias);
        // Check alias asynchronously with debouncing
        // to avoid excessive API calls while the user is typing
        validateAlias(newAlias);
    };

    const onCopy = async () => {
        setErrorMsg(undefined);
        setIsCopying(true);
        try {
            let urlToCopy = fullUrl;
            if (tinyUrlService) {
                urlToCopy = await tinyUrlService.shorten(fullUrl, {
                    alias: alias.trim() || undefined,
                    expiresInMs,
                });
            }
            await navigator.clipboard.writeText(urlToCopy);
            const escapedUrl = urlToCopy.replace(/&/g, "&amp;").replace(/</g, "&lt;");
            dispatch(
                interaction.actions.processSuccess(
                    "linkCopySuccess",
                    `Link copied to clipboard: <a href="${escapedUrl}" target="_blank" rel="noopener noreferrer">${escapedUrl}</a>`
                )
            );
            onDismiss();
        } catch (err) {
            setErrorMsg((err as Error).message);
        } finally {
            setIsCopying(false);
        }
    };

    const body = tinyUrlService ? (
        <>
            {errorMsg && <p className={styles.error}>{errorMsg}</p>}
            <p className={styles.description}>
                Clicking &quot;Copy Link&quot; will copy a shortened tinyurl.com link. You may
                optionally specify a custom alias for the short URL, if one isn&apos;t provided a
                random alias will be generated.
            </p>
            <label className={styles.fieldLabel}>Link expiration</label>
            <ChoiceGroup
                className={styles.expirationOptions}
                defaultSelectedKey={String(ONE_WEEK_MS)}
                options={EXPIRATION_OPTIONS}
                onChange={(_, option) => {
                    if (option) setExpiresInMs(Number(option.key));
                }}
            />
            <div className={styles.expiryNotice}>
                <strong>
                    ⚠ Shortened link expires in{" "}
                    {EXPIRATION_OPTIONS.find((o) => o.key === String(expiresInMs))?.text}
                </strong>
                For a permanent link, copy the URL directly from your browser&apos;s address bar.
            </div>
            <TextField
                className={styles.aliasInput}
                label="Custom alias (optional)"
                placeholder="e.g. my-figure-18"
                value={alias}
                onChange={(_, newValue) => onAliasChange(newValue ?? "")}
                prefix={`${TINY_URL_DOMAIN}/`}
                disabled={isCopying}
            />
            {aliasErrMsg && <p className={styles.aliasError}>{aliasErrMsg}</p>}
        </>
    ) : (
        <p className={styles.urlPreview}>{fullUrl}</p>
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
            body={<div className={styles.container}>{body}</div>}
            footer={footer}
            onDismiss={onDismiss}
            title="Copy Shareable Link"
        />
    );
}
