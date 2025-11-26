import * as React from "react";
import { useSelector } from "react-redux";

import { UNSAVED_DATA_WARNING } from "../constants";
import { interaction } from "../state";


/**
 * Hook for having the window provide a warning on exit if unsaved data is present
 */
export default () => {
    const hasUnsavedChanges = useSelector(interaction.selectors.getHasUnsavedChanges);

    React.useEffect(() => {
        const beforeUnloadHandler = (event: BeforeUnloadEvent) => {
            // Modern browser alert: Does not allow custom messages
            event.preventDefault();

            // Legacy support (e.g. Chrome/Edge < 119): Allows custom messages
            // Deprecated, does not affect modern browsers
            event.returnValue = UNSAVED_DATA_WARNING;
        };

        if (hasUnsavedChanges) window.addEventListener("beforeunload", beforeUnloadHandler);
        // remove the event listener
        return () => {
            window.removeEventListener("beforeunload", beforeUnloadHandler);
        };
    }, [hasUnsavedChanges]);
}
