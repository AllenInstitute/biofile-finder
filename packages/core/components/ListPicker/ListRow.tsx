import { DefaultButton, DirectionalHint, Icon, Spinner, SpinnerSize } from "@fluentui/react";
import classNames from "classnames";
import * as React from "react";

import { AnnotationValue } from "../../services/AnnotationService";

import styles from "./ListRow.module.css";

export interface ListItem<T = any> {
    disabled?: boolean;
    loading?: boolean;
    recent?: boolean;
    isBuffer?: boolean;
    selected: boolean;
    displayValue: AnnotationValue;
    value: AnnotationValue;
    description?: string;
    data?: T; // optional "user data" to stash on a list item to retrieve later
}

interface Props {
    item?: ListItem;
    onSelect: (item: ListItem) => void;
    onDeselect: (item: ListItem) => void;
    subMenuRenderer?: (item: ListItem) => React.ReactElement;
}

/**
 * Component responsible for rendering an individual item in the ListPicker
 */
export default function ListRow(props: Props) {
    const { item } = props;
    if (!item) {
        return null;
    }

    return (
        <DefaultButton
            className={classNames(styles.itemContainer, {
                [styles.selected]: item.selected,
                [styles.disabled]: item.disabled,
                [styles.isBuffer]: item.isBuffer,
            })}
            menuIconProps={{
                iconName: props.subMenuRenderer ? "ChevronRight" : undefined,
            }}
            menuProps={
                props.subMenuRenderer
                    ? {
                          directionalHint: DirectionalHint.rightTopEdge,
                          shouldFocusOnMount: true,
                          items: [{ key: "placeholder" }], // necessary to have a non-empty items list to have `onRenderMenuList` called
                          onRenderMenuList: () =>
                              props.subMenuRenderer?.(item) as React.ReactElement,
                      }
                    : undefined
            }
            disabled={item.disabled}
            onClick={() => (item.selected ? props.onDeselect(item) : props.onSelect(item))}
        >
            <label className={styles.item} title={item.description}>
                <div>{item.selected && <Icon iconName="CheckMark" />}</div>
                {item.displayValue}
            </label>
            {item.recent && <Icon iconName="Redo" />}
            {item.loading && <Spinner className={styles.spinner} size={SpinnerSize.small} />}
        </DefaultButton>
    );
}
