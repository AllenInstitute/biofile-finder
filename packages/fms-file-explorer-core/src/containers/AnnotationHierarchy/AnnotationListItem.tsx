import * as classNames from "classnames";
import Tippy from "@tippy.js/react";
import "tippy.js/dist/tippy.css"; // side-effect
import * as React from "react";

import SvgIcon from "../../components/SvgIcon";

const styles = require("./AnnotationListItem.module.css");

// Designed Daniel Bruce (www.entypo.com)
// License: https://creativecommons.org/licenses/by-sa/4.0/
const INFO_ICON_PATH_DATA =
    "M12.432 0c1.34 0 2.010 0.912 2.010 1.957 0 1.305-1.164 2.512-2.679 2.512-1.269 0-2.009-0.75-1.974-1.99 0-1.043 0.881-2.479 2.643-2.479zM8.309 20c-1.058 0-1.833-0.652-1.093-3.524l1.214-5.092c0.211-0.814 0.246-1.141 0-1.141-0.317 0-1.689 0.562-2.502 1.117l-0.528-0.88c2.572-2.186 5.531-3.467 6.801-3.467 1.057 0 1.233 1.273 0.705 3.23l-1.391 5.352c-0.246 0.945-0.141 1.271 0.106 1.271 0.317 0 1.357-0.392 2.379-1.207l0.6 0.814c-2.502 2.547-5.235 3.527-6.291 3.527z";
const DRAG_INDICATOR_ICON_PATH_DATA =
    "M15 15.984q0.797 0 1.406 0.609t0.609 1.406-0.609 1.406-1.406 0.609-1.406-0.609-0.609-1.406 0.609-1.406 1.406-0.609zM15 9.984q0.797 0 1.406 0.609t0.609 1.406-0.609 1.406-1.406 0.609-1.406-0.609-0.609-1.406 0.609-1.406 1.406-0.609zM15 8.016q-0.797 0-1.406-0.609t-0.609-1.406 0.609-1.406 1.406-0.609 1.406 0.609 0.609 1.406-0.609 1.406-1.406 0.609zM9 3.984q0.797 0 1.406 0.609t0.609 1.406-0.609 1.406-1.406 0.609-1.406-0.609-0.609-1.406 0.609-1.406 1.406-0.609zM9 9.984q0.797 0 1.406 0.609t0.609 1.406-0.609 1.406-1.406 0.609-1.406-0.609-0.609-1.406 0.609-1.406 1.406-0.609zM11.016 18q0 0.797-0.609 1.406t-1.406 0.609-1.406-0.609-0.609-1.406 0.609-1.406 1.406-0.609 1.406 0.609 0.609 1.406z";

interface AnnotationListItemProps {
    disabled: boolean;
    item: {
        id: string;
        description: string;
        title: string;
    };
}

/**
 * TODO
 */
export default function AnnotationListItem(props: AnnotationListItemProps) {
    const {
        disabled,
        item: { description, title },
    } = props;

    return (
        <>
            <SvgIcon
                className={classNames(styles.dragIndicator, {
                    [styles.disabled]: disabled,
                })}
                height={15}
                pathData={DRAG_INDICATOR_ICON_PATH_DATA}
                viewBox="0 0 24 24"
                width={15}
            />
            <Tippy content={description}>
                <SvgIcon
                    className={styles.info}
                    height={10}
                    pathData={INFO_ICON_PATH_DATA}
                    viewBox="0 0 20 20"
                    width={10}
                />
            </Tippy>
            <span
                className={classNames({
                    [styles.disabled]: disabled,
                })}
            >
                {title}
            </span>
        </>
    );
}
