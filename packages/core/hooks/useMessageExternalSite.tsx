import React from "react";

type MessageExternalSiteContextType = {
    send: (url: string, message: NonNullable<unknown>) => void;
    setOnReceive: (onReceive: ((message: unknown) => void) | undefined) => void;
};

const noop = () => undefined;
const MessageExternalSiteContext = React.createContext<MessageExternalSiteContextType>({
    send: noop,
    setOnReceive: noop,
});

/**
 * A provider component for the `useMessageExternalSite` hook, which lazily creates and manages an
 * invisible `iframe` when we want to communicate with an external site.
 *
 * This exists separately from the hook so that the `iframe` can be placed in a stable location in
 * the document, allowing the hook to be used in components that re-render often without reloading
 * the `iframe` over and over.
 */
const MessageExternalSiteProvider: React.FC = ({ children }) => {
    const [iFrameUrl, setIFrameUrl] = React.useState<string | null>(null);
    const onReceiveRef = React.useRef<((message: unknown) => void) | undefined>(undefined);
    const pendingMessageRef = React.useRef<NonNullable<unknown> | null>(null);
    const iFrameRef = React.useRef<HTMLIFrameElement>(null);

    const send = React.useCallback(
        (url: string, message: NonNullable<unknown>) => {
            if (iFrameUrl !== url) {
                // If the iframe doesn't exist or goes to the wrong URL, create a new one and defer
                // the message until it loads.
                setIFrameUrl(url);
                pendingMessageRef.current = message;
            } else {
                // Otherwise, send the message immediately.
                iFrameRef.current?.contentWindow?.postMessage(message, url);
            }
        },
        [iFrameUrl]
    );

    const setOnReceive = React.useCallback(
        (onReceive: ((message: unknown) => void) | undefined) => {
            onReceiveRef.current = onReceive;
        },
        []
    );

    // Attach event listeners when a new iframe is created.
    React.useEffect(() => {
        const frame = iFrameRef.current;
        if (frame === null || iFrameUrl === null) {
            return;
        }
        const origin = new URL(iFrameUrl).origin;

        // We've just made a new iframe. Listen for messages from it.
        const onMessage = (event: MessageEvent) => {
            if (event.origin === origin && event.source === iFrameRef.current?.contentWindow) {
                onReceiveRef.current?.(event.data);
            }
        };

        window.addEventListener("message", onMessage);
        if (pendingMessageRef.current === null) {
            return () => window.removeEventListener("message", onMessage);
        }

        // We've got a pending message for this new iframe. Send it when the iframe loads.
        const onLoad = () => {
            frame.contentWindow?.postMessage(pendingMessageRef.current, iFrameUrl);
            pendingMessageRef.current = null;
        };

        frame.addEventListener("load", onLoad);
        return () => {
            window.removeEventListener("message", onMessage);
            frame.removeEventListener("load", onLoad);
        };
    }, [iFrameUrl]);

    const value = React.useMemo(() => ({ send, setOnReceive }), [send, setOnReceive]);

    return (
        <MessageExternalSiteContext.Provider value={value}>
            {children}
            {iFrameUrl && <iframe ref={iFrameRef} src={iFrameUrl} style={{ display: "none" }} />}
        </MessageExternalSiteContext.Provider>
    );
};

/**
 * A hook for sending messages to/from an external site, by lazily creating an `iframe` when a
 * message is sent.
 *
 * `MessageExternalSiteProvider` must be a parent of the component using this hook, to place the
 * `iframe` somewhere stable in the document.
 */
const useMessageExternalSite = <Tx extends NonNullable<unknown>>(
    url: string
): [(message: Tx) => void, (onReceive: ((message: unknown) => void) | undefined) => void] => {
    const { send, setOnReceive } = React.useContext(MessageExternalSiteContext);

    const wrappedSend = React.useCallback((message: Tx) => send(url, message), [send, url]);
    return [wrappedSend, setOnReceive];
};

export { MessageExternalSiteProvider };
export default useMessageExternalSite;
