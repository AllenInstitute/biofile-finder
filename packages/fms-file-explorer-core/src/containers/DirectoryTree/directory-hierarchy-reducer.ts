interface State {
    collapsed: boolean;
    content: JSX.Element | JSX.Element[] | null;
    isLoading: boolean;
    error: Error | null;
}

interface Action {
    type: string;
    payload: any;
}

export default function directoryHierarchyReducer() {}
