import * as React from "react";

export interface ListItemData {
    id: string | number;
    description?: string;
    title: any;
}

interface ListItemProps {
    data: ListItemData;
}

export default function ListItem(props: ListItemProps) {
    const {
        data: { title },
    } = props;
    return <li>{title}</li>;
}
