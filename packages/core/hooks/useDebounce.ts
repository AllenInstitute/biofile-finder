import { useEffect, useState } from "react";

/**
 * Delays changes to a value until no changes have occurred for the set delay
 * period, in milliseconds. This is useful for delaying changes to state when a
 * value may update very quickly.
 *
 * Adapted from https://usehooks-ts.com/react-hook/use-debounce.
 *
 * @param value The value to return.
 * @param delayMs The delay, in milliseconds. 500 by default.
 * @returns The `value` once no changes have occurred for `delay` milliseconds.
 * @example
 * ```
 * const [value, setValue] = useState(0);
 * const debouncedValue = useDebounce(value, 500);
 *
 * useEffect(() => {
 *  // Some expensive operation
 * }, [debouncedValue])
 *
 * return(
 *  <div>
 *      <p>{debouncedValue}</p>
 *  </div>
 * )
 * ```
 */
export default function useDebounce<T>(value: T, delayMs = 500): T {
    const [debouncedValue, setDebouncedValue] = useState<T>(value);

    useEffect(() => {
        const timer = setTimeout(() => setDebouncedValue(value), delayMs);
        return () => {
            clearTimeout(timer);
        };
    }, [value, delayMs]);

    return debouncedValue;
}
