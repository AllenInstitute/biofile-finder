import React from "react";

const useMessageExternalSite = <T,>(url: string): [(message: T) => void, React.ReactNode] => {
    const [iFrameRenderedUrl, setIframeRenderedUrl] = React.useState<string | null>(null);
    const pendingMessageRef = React.useRef<T | null>(null);
    const iFrameRef = React.useRef<HTMLIFrameElement>(null);

    const sendMessage = React.useCallback(
        (message: T) => {
            if (iFrameRenderedUrl !== url) {
                setIframeRenderedUrl(url);
                pendingMessageRef.current = message;
            } else {
                iFrameRef.current?.contentWindow?.postMessage(message, url);
            }
        },
        [url, iFrameRenderedUrl]
    );

    React.useEffect(() => {
        if (
            pendingMessageRef.current !== null &&
            iFrameRef.current !== null &&
            iFrameRenderedUrl !== null
        ) {
            const frame = iFrameRef.current;
            const onLoad = () => {
                frame.contentWindow?.postMessage(pendingMessageRef.current, iFrameRenderedUrl);
                pendingMessageRef.current = null;
            };

            frame.addEventListener("load", onLoad);
            return () => frame.removeEventListener("load", onLoad);
        }
    }, [iFrameRenderedUrl]);

    const element = iFrameRenderedUrl ? (
        <iframe ref={iFrameRef} src={iFrameRenderedUrl} style={{ display: "none" }} />
    ) : null;

    return [sendMessage, element];
};

export default useMessageExternalSite;
