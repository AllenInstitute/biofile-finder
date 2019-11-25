import * as React from "react";

export interface ListItemData {
    id: string | number;
    description?: string;
    title: any;
}

interface ListItemProps {
    data: ListItemData;
}

/**
 * Fundamental list item component rendered by List. Separated from List simply to keep files small and components as
 * single-purpose as possible.
 */
export default function ListItem(props: ListItemProps) {
    const {
        data: { title },
    } = props;
    return <li>{title}</li>;
}
