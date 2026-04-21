/**
 * Stub. No provenance-graph feature in this simplified build. Types and class
 * preserved only to satisfy references in DatabaseService / metadata state.
 */

interface EdgeNode {
    name: string;
    type: "file" | "metadata";
}

export interface EdgeDefinition {
    parent: EdgeNode;
    child: EdgeNode;
    relationship: string;
    relationshipType?: "pointer";
}

export default class Graph {
    constructor(..._args: unknown[]) {
        /* stub */
    }
    public reset() {
        /* noop */
    }
    public async originate(..._args: unknown[]) {
        /* noop */
    }
}
