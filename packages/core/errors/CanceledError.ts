/**
 * Used to indicate that a query has been canceled,
 * either by the user or because the query is stale
 */
export default class CanceledError extends Error {
    constructor(message = "Query canceled") {
        super(message);
        this.name = "CanceledError";
    }
}
