import { List } from "office-ui-fabric-react";
import * as React from "react";
import { useDispatch, useSelector } from "react-redux";

import FileFilter from "../../entity/FileFilter";
import FilterValue from "./FilterValue";
import { makeFilterItemsSelector } from "./selectors";
import { selection, State } from "../../state";

interface AnnotationFilterFormProps {
    annotationName: string;
}

export default function AnnotationFilterForm(props: AnnotationFilterFormProps) {
    const { annotationName } = props;

    const dispatch = useDispatch();
    const getAnnotationValueFilters = React.useMemo(makeFilterItemsSelector, []);
    const items = useSelector((state: State) => getAnnotationValueFilters(state, annotationName));

    const onFilterStateChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        if (event.target.checked) {
            dispatch(
                selection.actions.addFileFilter(new FileFilter(annotationName, event.target.value))
            );
        } else {
            dispatch(
                selection.actions.removeFileFilter(
                    new FileFilter(annotationName, event.target.value)
                )
            );
        }
    };

    return (
        <List
            getKey={(item) => String(item.value)}
            items={items}
            onShouldVirtualize={() => items.length > 100}
            onRenderCell={(item) =>
                item && (
                    <FilterValue
                        checked={item.checked}
                        onChange={onFilterStateChange}
                        value={item.value}
                    />
                )
            }
        />
    );
}
