import * as classNames from "classnames";
import { map } from "lodash";
import * as React from "react";

import ListItem, { ListItemData } from "./ListItem";

const styles = require("./List.module.css");

interface ListProps {
    className?: string;
    items: ListItemData[];
}

/**
 * Fundamental list component rendered by AnnotationList. Separated from AnnotationList simply to keep files small and
 * components as single-purpose as possible.
 */
export default function List(props: ListProps) {
    return (
        <ul className={classNames(styles.list, props.className)}>
            {map(props.items, (item) => (
                <ListItem key={item.id} data={item} />
            ))}
        </ul>
    );
}
