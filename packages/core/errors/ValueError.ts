/**
 * Intended to have exactly the same semantics as Python's ValueError. From the docs:
 * "Raised when an operation or function receives an argument that has the right type
 * but an inappropriate value, and the situation is not described by a more precise
 * exception such as IndexError."
 */
export default class ValueError extends Error {
    public constructor(message?: string) {
        super(message);
        this.name = "ValueError";
    }
}
