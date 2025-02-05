import { DefaultButton, DirectionalHint, Icon } from "@fluentui/react";
import classNames from "classnames";
import * as React from "react";

import { useButtonMenu } from "../Buttons";
import LoadingIcon from "../Icons/LoadingIcon";
import Tooltip from "../Tooltip";
import { AnnotationValue } from "../../services/AnnotationService";

import styles from "./ListRow.module.css";

export interface ListItem<T = any> {
    disabled?: boolean;
    loading?: boolean;
    recent?: boolean;
    isDivider?: boolean;
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
    const buttonMenu = useButtonMenu({
        directionalHint: DirectionalHint.rightTopEdge,
        // necessary to have a non-empty items list to have `onRenderMenuList` called
        items: [{ key: "placeholder" }],
        onRenderMenuList: () => props.subMenuRenderer?.(item as ListItem) as React.ReactElement,
    });

    if (!item) {
        return null;
    }

    return (
        <Tooltip content={`${item.displayValue}${item.description ? `: ${item.description}` : ""}`}>
            <DefaultButton
                className={classNames(styles.itemContainer, {
                    [styles.selected]: item.selected,
                    [styles.disabled]: item.disabled,
                    [styles.divider]: item.isDivider,
                })}
                menuIconProps={{
                    iconName: props.subMenuRenderer && !item.isDivider ? "ChevronRight" : undefined,
                }}
                menuProps={props.subMenuRenderer ? buttonMenu : undefined}
                data-testid={`default-button-${item.displayValue}`}
                disabled={item.disabled}
                onClick={() => (item.selected ? props.onDeselect(item) : props.onSelect(item))}
            >
                <label className={styles.item}>
                    <div>{item.selected && <Icon iconName="CheckMark" />}</div>
                    <p>{item.displayValue}</p>
                </label>
                {item.recent && <Icon iconName="Recent" />}
                {item.loading && <LoadingIcon />}
            </DefaultButton>
        </Tooltip>
    );
}
