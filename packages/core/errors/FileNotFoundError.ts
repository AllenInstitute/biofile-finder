// Intended to be raised when a user attempts to open a local file path,
//  but that file path is not available on their machine.
export default class FileNotFoundError extends Error {
    constructor(message: string) {
        super(message);

        this.name = "FileNotFoundError";
    }
}
