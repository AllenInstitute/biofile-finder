import * as React from "react";

export function useKeyDown(targetKeys: string[], handler: (event: KeyboardEvent) => void) {
    React.useEffect(() => {
        const keydownListener = (event: KeyboardEvent) => {
            // Check if all target keys are pressed
            const allKeysPressed = targetKeys.every(
                (key) =>
                    event.getModifierState(key) || event.key.toLowerCase() === key.toLowerCase()
            );

            if (allKeysPressed) {
                handler(event);
            }
        };

        window.addEventListener("keydown", keydownListener);

        return () => {
            window.removeEventListener("keydown", keydownListener);
        };
    }, [targetKeys, handler]);
}
