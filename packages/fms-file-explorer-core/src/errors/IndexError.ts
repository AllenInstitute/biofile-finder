/**
 * Intended to have exactly the same semantics as Python's IndexError. From the docs:
 * "Raised when a sequence subscript is out of range."
 */
export default class IndexError extends Error {
    public constructor(message?: string) {
        super(message);
        this.name = "IndexError";
    }
}