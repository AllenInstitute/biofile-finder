import { DefaultButton, DirectionalHint, Icon } from "@fluentui/react";
import classNames from "classnames";
import * as React from "react";

import { useButtonMenu } from "../Buttons";
import LoadingIcon from "../Icons/LoadingIcon";
import Tooltip from "../Tooltip";
import { AnnotationValue } from "../../entity/Annotation";

import styles from "./ListRow.module.css";

export interface ListItem<T = any> {
    disabled?: boolean;
    loading?: boolean;
    recent?: boolean;
    isDivider?: boolean;
    selected: boolean;
    breadcrumbs?: string[]; // optional array of strings to show as breadcrumbs to the left of the item
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

    const breadcrumbs = item.breadcrumbs ? `${item.breadcrumbs.join(" / ")} / ` : undefined;
    let tooltip: string | undefined;
    if (item.breadcrumbs && item.description)
        tooltip = `${breadcrumbs}${item.value}: ${item.description}`;
    else if (item.breadcrumbs) tooltip = `${breadcrumbs}${item.value}`;
    else if (item.description) tooltip = item.description;

    return (
        <Tooltip content={tooltip}>
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
                data-testid={`default-button-${item.value}`}
                disabled={item.disabled}
                onClick={() => (item.selected ? props.onDeselect(item) : props.onSelect(item))}
            >
                <label className={styles.item}>
                    <div>{item.selected && <Icon iconName="CheckMark" />}</div>
                    <p>
                        {!!breadcrumbs && <span className={styles.breadcrumbs}>{breadcrumbs}</span>}
                        {item.displayValue ?? item.value}
                    </p>
                </label>
                {item.recent && <Icon iconName="Recent" />}
                {item.loading && <LoadingIcon invertColor={!item.selected} />}
            </DefaultButton>
        </Tooltip>
    );
}
