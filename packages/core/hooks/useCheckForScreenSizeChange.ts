import * as React from "react";
import { useDispatch } from "react-redux";

import { interaction } from "../state";


// Pixel size; used to alert users that screen is too small for optimal use
const SMALL_SCREEN_BREAKPOINT = 768;

/**
 * Check for screen size changes
 */
export default (measuredWidth: number) => {
    const dispatch = useDispatch();

    // Respond to screen size changes
    React.useEffect(() => {
        // Don't display when hook is still loading
        if (measuredWidth === 0) return;

        // Screen too small, should warn user
        const isSmallScreen = measuredWidth < SMALL_SCREEN_BREAKPOINT;
        dispatch(interaction.actions.setIsSmallScreen(isSmallScreen));
    }, [dispatch, measuredWidth]);
}
