import React from "react";

type MessageFunction = (url: string, message: NonNullable<unknown>) => void;
const MessageExternalSiteContext = React.createContext<MessageFunction>(() => undefined);

const MessageExternalSiteProvider: React.FC = ({ children }) => {
    const [iFrameUrl, setIFrameUrl] = React.useState<string | null>(null);
    const pendingMessageRef = React.useRef<NonNullable<unknown> | null>(null);
    const iFrameRef = React.useRef<HTMLIFrameElement>(null);

    const sendMessage = React.useCallback(
        (url: string, message: NonNullable<unknown>) => {
            if (iFrameUrl !== url) {
                setIFrameUrl(url);
                pendingMessageRef.current = message;
            } else {
                iFrameRef.current?.contentWindow?.postMessage(message, url);
            }
        },
        [iFrameUrl]
    );

    React.useEffect(() => {
        if (
            pendingMessageRef.current !== null &&
            iFrameRef.current !== null &&
            iFrameUrl !== null
        ) {
            const frame = iFrameRef.current;
            const onLoad = () => {
                frame.contentWindow?.postMessage(pendingMessageRef.current, iFrameUrl);
                pendingMessageRef.current = null;
            };

            frame.addEventListener("load", onLoad);
            return () => frame.removeEventListener("load", onLoad);
        }
    }, [iFrameUrl]);

    return (
        <MessageExternalSiteContext.Provider value={sendMessage}>
            {children}
            {iFrameUrl && <iframe ref={iFrameRef} src={iFrameUrl} style={{ display: "none" }} />}
        </MessageExternalSiteContext.Provider>
    );
};

/**
 * A hook for sending a message to an external site, via an `iframe`.
 *
 * `MessageExternalSiteProvider` must be a parent of the component using this hook, to place an `iframe` somewhere
 * stable in the document.
 */
const useMessageExternalSite = <T extends NonNullable<unknown>>(
    url: string
): ((message: T) => void) => {
    const sendMessage = React.useContext(MessageExternalSiteContext);

    return React.useCallback((message: T) => sendMessage(url, message), [sendMessage, url]);
};

export { MessageExternalSiteProvider };
export default useMessageExternalSite;
