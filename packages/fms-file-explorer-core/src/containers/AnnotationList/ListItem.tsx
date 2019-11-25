import * as React from "react";

export interface ListItemProps {
    id: string | number;
    value: any;
}

export default function ListItem(props: ListItemProps) {
    return <li>{props.value}</li>;
}
