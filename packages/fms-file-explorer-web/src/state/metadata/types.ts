export interface MetadataStateBranch {
    [key: string]: any;
}

export interface ReceiveAction {
    payload: MetadataStateBranch;
    type: string;
}

export interface RequestAction {
    type: string;
}
