import * as React from "react";

export interface ListItemProps {
    id: string | number;
    description?: string;
    title: any;
}

export default function ListItem(props: ListItemProps) {
    return <li>{props.title}</li>;
}
