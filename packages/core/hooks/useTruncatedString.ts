import * as React from "react";


/**
 * Hook for truncating the given sentence based on the maximum given
 * to have ellipsis in the middle of the given sentence/string rather
 * than the css default of ellipsis at the end
 * 
 * Ex. "Some really long sentence here" -> "Some rea...ce here"
 */
export default (sentence: string, limit: number) => {
    return React.useMemo(() => {
        if (sentence.length <= limit) {
            return sentence;
        }

        const lowerLimit = Math.floor(limit / 2) - 2; // Ex. (29 / 2) - 2 = 12
        const upperLimit = Math.floor(limit / -2) - 3 // Ex. (29 / -2) - 3 = -13
        return sentence.slice(0, lowerLimit) + "..." + sentence.slice(upperLimit);
    }, [sentence]);
}
