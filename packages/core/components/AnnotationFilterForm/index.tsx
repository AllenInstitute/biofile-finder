import { IChoiceGroupOption } from "@fluentui/react";
import classNames from "classnames";
import { isNil } from "lodash";
import * as React from "react";
import { useDispatch, useSelector } from "react-redux";

import useAnnotationValues from "./useAnnotationValues";
import SearchBoxForm from "./SearchBoxForm";
import ChoiceGroup from "../ChoiceGroup";
import DateRangePicker from "../DateRangePicker";
import LoadingIcon from "../Icons/LoadingIcon";
import ListPicker from "../ListPicker";
import { ListItem } from "../ListPicker/ListRow";
import NumberRangePicker from "../NumberRangePicker";
import Annotation from "../../entity/Annotation";
import AnnotationName from "../../entity/Annotation/AnnotationName";
import { AnnotationType } from "../../entity/AnnotationFormatter";
import FileFilter, { FilterType } from "../../entity/FileFilter";
import NestedCombinationFilter, {
    NestedCondition,
} from "../../entity/FileFilter/NestedCombinationFilter";
import { interaction, selection } from "../../state";

import styles from "./AnnotationFilterForm.module.css";

interface AnnotationFilterFormProps {
    annotation: Annotation;
}

// Which nested-filter mode is currently active.
type NestedFilterMode = "flat" | "byField" | "byCombination";

/**
 * A form that provides a user the ability to select particular annotation values with which
 * to filter the application's data. It will render different "value pickers" based on the type
 * of annotation: if the annotation is of type string, it will render a list for the user to choose
 * amongst its items; if the annotation is of type date, it will render a date input; etc.
 *
 * For nested annotations (JSON VARCHAR columns or parquet STRUCT columns) an additional
 * "nested filter" section is shown above the standard controls, offering three modes:
 *
 *  • **Flat** – search the whole serialised JSON value (original behaviour).
 *  • **By field** – filter on a specific dot-separated sub-path (e.g. "Gene" or "Dose.Value").
 *    Uses `FileFilter` with `nestedJsonPath` which generates a `json_contains … $[*].<path>` query.
 *  • **By combination** – filter on multiple (path, value) pairs that must ALL be satisfied
 *    within the **same** nested entry. Uses `NestedCombinationFilter` which generates a
 *    DuckDB `list_filter` lambda query.
 */
export default function AnnotationFilterForm(props: AnnotationFilterFormProps) {
    const dispatch = useDispatch();
    const allFilters = useSelector(selection.selectors.getFileFilters);
    const fuzzyFilters = useSelector(selection.selectors.getFuzzyFilters);
    const canFuzzySearch = useSelector(selection.selectors.isQueryingAicsFms);
    const annotationService = useSelector(interaction.selectors.getAnnotationService);
    const [annotationValues, isLoading, errorMessage] = useAnnotationValues(
        props.annotation.name,
        annotationService
    );

    // ------------------------------------------------------------------ //
    //  Detect whether this annotation carries nested (JSON object) values. //
    //  True when:  (a) the Annotation.isNested flag is set (STRUCT/MAP),   //
    //              (b) the annotation returns JSON-object strings.          //
    //  Not true for virtual sub-field annotations (they ARE a specific     //
    //  field already; no further nesting UI is needed for them).           //
    // ------------------------------------------------------------------ //
    const isNestedAnnotation = React.useMemo(() => {
        // Virtual sub-field annotations (e.g. "Well.Gene") should show flat filtering only.
        if (props.annotation.isNestedSubField) return false;
        if (props.annotation.isNested) return true;
        if (!annotationValues?.length) return false;
        try {
            const first = JSON.parse(String(annotationValues[0]));
            return typeof first === "object" && first !== null && !Array.isArray(first);
        } catch {
            return false;
        }
    }, [props.annotation, annotationValues]);

    // ---- Nested filter local state ---- //
    const [nestedMode, setNestedMode] = React.useState<NestedFilterMode>("flat");

    // "By field" state: single dot-separated path + the value will be provided by the
    // standard picker below once the user switches to byField mode.
    const [fieldPath, setFieldPath] = React.useState("");

    // "By combination" state: list of (path, value) rows.
    const [combRows, setCombRows] = React.useState<NestedCondition[]>([
        { path: [], elementJsonPath: "", value: "" },
    ]);

    const fuzzySearchEnabled = React.useMemo(
        () => !!fuzzyFilters?.some((filter) => filter.name === props.annotation.name),
        [fuzzyFilters, props.annotation]
    );

    const filtersForAnnotation = React.useMemo(
        () => allFilters.filter((filter) => filter.name === props.annotation.name),
        [allFilters, props.annotation]
    );

    // Assume all filters use same type
    const defaultFilterType = React.useMemo(
        () => filtersForAnnotation?.[0]?.type ?? FilterType.DEFAULT,
        [filtersForAnnotation]
    );

    const [filterType, setFilterType] = React.useState<FilterType>(defaultFilterType);

    // Propagate regular file filter values from state into UI
    const items = React.useMemo<ListItem[]>(() => {
        const appliedFilters = new Set(filtersForAnnotation.map((filter) => filter.value));

        return (annotationValues || []).map((value) => ({
            selected: appliedFilters.has(value),
            displayValue: props.annotation.getDisplayValue(value) || value,
            value,
        }));
    }, [props.annotation, annotationValues, filtersForAnnotation]);

    const onDeselectAll = () => {
        // remove all regular filters for this annotation
        dispatch(selection.actions.removeFileFilter(filtersForAnnotation));
    };

    const onDeselect = (item: ListItem) => {
        dispatch(selection.actions.removeFileFilter(createFileFilter(item)));
    };

    const onSelect = (item: ListItem) => {
        dispatch(selection.actions.changeFileFilterType(props.annotation.name, FilterType.DEFAULT));
        dispatch(selection.actions.addFileFilter(createFileFilter(item)));
    };

    // TODO: Should this select ALL or just the visible items in list?
    const onSelectAll = () => {
        dispatch(selection.actions.changeFileFilterType(props.annotation.name, FilterType.DEFAULT));
        dispatch(selection.actions.addFileFilter(items.map((item) => createFileFilter(item))));
    };

    const createFileFilter = (item: ListItem) => {
        const value = isNil(props.annotation.valueOf(item.value))
            ? item.value
            : props.annotation.valueOf(item.value);

        // For virtual sub-field annotations (e.g. "Well.Gene"), pass nestedParent and
        // nestedJsonPath/nestedListExpression so the filter produces the correct SQL.
        if (
            props.annotation.isNestedSubField &&
            props.annotation.nestedParent &&
            (props.annotation.nestedJsonPath || props.annotation.nestedListExpression)
        ) {
            return new FileFilter(
                props.annotation.name,
                value,
                filterType,
                props.annotation.nestedJsonPath,
                props.annotation.nestedParent,
                props.annotation.nestedListExpression
            );
        }

        return new FileFilter(props.annotation.name, value, filterType);
    };

    const onFilterTypeOptionChange = (option: IChoiceGroupOption | undefined) => {
        // Verify that filter type is changing to avoid dispatching unnecessary clean-up actions
        if (!!option?.key && option?.key !== filterType) {
            setFilterType(option.key as FilterType);
            // Selecting ANY or NONE should automatically re-trigger search and re-render dom,
            // but selecting SOME shouldn't trigger anything until a value is selected
            // or a search term is entered
            switch (option.key) {
                case FilterType.DEFAULT:
                    return; // No further action needed, dispatch on search instead
                case FilterType.EXCLUDE:
                case FilterType.ANY:
                default:
                    dispatch(
                        selection.actions.changeFileFilterType(
                            props.annotation.name,
                            option.key as FilterType
                        )
                    );
            }
        }
    };

    function onSearch(filterValue: string, type: FilterType = FilterType.DEFAULT) {
        if (filterValue && filterValue.trim()) {
            const isVirtualSubField =
                props.annotation.isNestedSubField &&
                !!props.annotation.nestedParent &&
                !!(props.annotation.nestedJsonPath || props.annotation.nestedListExpression);

            dispatch(
                selection.actions.setFileFilters([
                    ...allFilters.filter((filter) => filter.name !== props.annotation.name),
                    isVirtualSubField
                        ? new FileFilter(
                              props.annotation.name,
                              filterValue,
                              type,
                              props.annotation.nestedJsonPath,
                              props.annotation.nestedParent,
                              props.annotation.nestedListExpression
                          )
                        : new FileFilter(props.annotation.name, filterValue, type),
                ])
            );
        }
    }

    // ------------------------------------------------------------------ //
    //  Nested filter handlers                                              //
    // ------------------------------------------------------------------ //

    /** Apply a "by field" filter: one path targeting values anywhere in that sub-field. */
    function onApplyByField() {
        const path = fieldPath.trim();
        if (!path) return;
        const segments = path
            .split(".")
            .map((s) => s.trim())
            .filter(Boolean);
        if (!segments.length) return;
        // Build a JSON array wildcard path: $[*].Gene or $[*].Dose.Value
        const nestedJsonPath = `$[*].${segments.join(".")}`;
        dispatch(
            selection.actions.setFileFilters([
                // Remove any existing nested-path filters for this annotation+path.
                ...allFilters.filter(
                    (f) => f.name !== props.annotation.name || f.nestedJsonPath !== nestedJsonPath
                ),
                new FileFilter(props.annotation.name, "", FilterType.ANY, nestedJsonPath),
            ])
        );
    }

    /** Apply a "by field" filter with a specific value. */
    function onApplyByFieldValue(value: string) {
        if (!value.trim()) return;
        const segments = fieldPath
            .trim()
            .split(".")
            .map((s) => s.trim())
            .filter(Boolean);
        if (!segments.length) return;
        const nestedJsonPath = `$[*].${segments.join(".")}`;
        dispatch(
            selection.actions.addFileFilter(
                new FileFilter(props.annotation.name, value, FilterType.DEFAULT, nestedJsonPath)
            )
        );
    }

    /** Apply a "by combination" filter requiring all rows to match the same nested entry. */
    function onApplyByCombination() {
        const conditions: NestedCondition[] = combRows
            .map((row) => {
                const segments = (typeof row.path === "string"
                    ? ((row.path as unknown) as string).split(".").map((s) => s.trim())
                    : row.path
                ).filter(Boolean);
                // elementJsonPath is relative to a single array element; use $.segment.path
                const elementJsonPath = `$.${segments.join(".")}`;
                return {
                    path: segments,
                    elementJsonPath,
                    value: row.value,
                };
            })
            .filter((c) => c.path.length > 0 && String(c.value).trim() !== "");

        if (!conditions.length) return;
        dispatch(
            selection.actions.setFileFilters([
                ...allFilters.filter((f) => f.name !== props.annotation.name),
                new NestedCombinationFilter(
                    props.annotation.name,
                    conditions,
                    !!props.annotation.nestedListExpression
                ),
            ])
        );
    }

    if (isLoading) {
        return (
            <div className={styles.loadingContainer}>
                <LoadingIcon />
            </div>
        );
    }

    const listPickerComponent = (
        <ListPicker
            items={items}
            loading={isLoading}
            errorMessage={errorMessage}
            onDeselect={onDeselect}
            onDeselectAll={onDeselectAll}
            onSelect={onSelect}
            onSelectAll={onSelectAll}
        />
    );

    const searchFormType = () => {
        // Use the checkboxes if values exist and are few enough to reasonably scroll through
        if (items.length > 0 && items.length <= 100) {
            return listPickerComponent;
        }

        switch (props.annotation.type) {
            case AnnotationType.DATE:
            case AnnotationType.DATETIME:
                return (
                    <DateRangePicker
                        className={styles.picker}
                        onSearch={onSearch}
                        onReset={onDeselectAll}
                        currentRange={filtersForAnnotation?.[0]}
                        type={props.annotation.type}
                    />
                );
            case AnnotationType.NUMBER:
                // File size is a special case where we don't have
                // the ability to filter by range in the backend yet
                // so we'll just let that case fall through to the string below
                if (props.annotation.name !== AnnotationName.FILE_SIZE) {
                    return (
                        <NumberRangePicker
                            className={styles.picker}
                            items={items}
                            loading={isLoading}
                            errorMessage={errorMessage}
                            onSearch={onSearch}
                            currentRange={filtersForAnnotation?.[0]}
                            units={props.annotation.units}
                        />
                    );
                }
            case AnnotationType.STRING:
                // Annotations without a scrollable list of values, e.g., File Path
                if (items.length == 0) {
                    return (
                        <SearchBoxForm
                            className={styles.picker}
                            onSelectAll={onSelectAll}
                            onDeselectAll={onDeselectAll}
                            onSearch={onSearch}
                            fuzzySearchEnabled={fuzzySearchEnabled}
                            fieldName={props.annotation.displayName}
                            defaultValue={filtersForAnnotation?.[0]}
                            hideFuzzyToggle={!canFuzzySearch}
                        />
                    );
                }
            case AnnotationType.DURATION:
            // prettier-ignore
            default: // FALL-THROUGH
                return (listPickerComponent);
        }
    };

    // ------------------------------------------------------------------ //
    //  Nested filter panel — shown only for nested annotations             //
    // ------------------------------------------------------------------ //
    const nestedPanel = isNestedAnnotation && (
        <div className={styles.nestedSection}>
            {/* Mode selector */}
            <div className={styles.nestedModeBar}>
                {([
                    ["flat", "Flat"],
                    ["byField", "By field"],
                    ["byCombination", "Combined"],
                ] as [NestedFilterMode, string][]).map(([mode, label]) => (
                    <button
                        key={mode}
                        className={classNames(styles.nestedModeBtn, {
                            [styles.active]: nestedMode === mode,
                        })}
                        onClick={() => setNestedMode(mode)}
                    >
                        {label}
                    </button>
                ))}
            </div>

            {nestedMode === "flat" && (
                <p className={styles.nestedNote}>
                    Searching the full serialised value — any match at any depth is included.
                </p>
            )}

            {nestedMode === "byField" && (
                <>
                    <p className={styles.nestedNote}>
                        Target a specific sub-field at any depth (e.g. <code>Gene</code> or{" "}
                        <code>Dose.Value</code>). All entries in the object will be searched.
                    </p>
                    <div className={styles.nestedConditionRow}>
                        <input
                            className={styles.nestedPathInput}
                            placeholder="Sub-field path (e.g. Gene)"
                            value={fieldPath}
                            onChange={(e) => setFieldPath(e.target.value)}
                        />
                        <input
                            className={styles.nestedValueInput}
                            placeholder="Value (leave blank = any)"
                            onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                    const v = (e.target as HTMLInputElement).value;
                                    v ? onApplyByFieldValue(v) : onApplyByField();
                                }
                            }}
                        />
                    </div>
                    <button className={styles.nestedApplyBtn} onClick={onApplyByField}>
                        Apply (any value at this path)
                    </button>
                </>
            )}

            {nestedMode === "byCombination" && (
                <>
                    <p className={styles.nestedNote}>
                        All conditions must be satisfied within the <strong>same</strong> nested
                        entry.
                    </p>
                    {combRows.map((row, idx) => (
                        <div key={idx} className={styles.nestedConditionRow}>
                            <input
                                className={styles.nestedPathInput}
                                placeholder="Path (e.g. Gene)"
                                value={
                                    Array.isArray(row.path)
                                        ? row.path.join(".")
                                        : ((row.path as unknown) as string)
                                }
                                onChange={(e) => {
                                    const updated = [...combRows];
                                    (updated[idx] as any).path = e.target.value;
                                    setCombRows(updated);
                                }}
                            />
                            <input
                                className={styles.nestedValueInput}
                                placeholder="Value"
                                value={String(row.value)}
                                onChange={(e) => {
                                    const updated = [...combRows];
                                    updated[idx] = { ...updated[idx], value: e.target.value };
                                    setCombRows(updated);
                                }}
                            />
                            {combRows.length > 1 && (
                                <button
                                    className={styles.nestedRemoveBtn}
                                    title="Remove condition"
                                    onClick={() =>
                                        setCombRows(combRows.filter((_, i) => i !== idx))
                                    }
                                >
                                    ×
                                </button>
                            )}
                        </div>
                    ))}
                    <button
                        className={styles.nestedAddBtn}
                        onClick={() =>
                            setCombRows([...combRows, { path: [], elementJsonPath: "", value: "" }])
                        }
                    >
                        + Add condition
                    </button>
                    <button className={styles.nestedApplyBtn} onClick={onApplyByCombination}>
                        Apply combination filter
                    </button>
                </>
            )}
        </div>
    );

    return (
        <div>
            <div className={classNames(styles.header)}>
                <h3>Filter {props.annotation.displayName} by</h3>
                <ChoiceGroup
                    className={styles.choiceGroup}
                    // Fuzzy is not in choice group
                    defaultSelectedKey={
                        filterType !== FilterType.FUZZY ? filterType : FilterType.DEFAULT
                    }
                    options={[
                        {
                            key: FilterType.DEFAULT,
                            text: `Some value${items.length > 0 ? "(s)" : ""}`,
                        },
                        {
                            key: FilterType.ANY,
                            text: "Any value",
                        },
                        {
                            key: FilterType.EXCLUDE,
                            text: "No value",
                        },
                    ]}
                    onChange={(_, option) => onFilterTypeOptionChange(option)}
                />
            </div>
            {/* Nested filter panel (shown when annotation has nested structure) */}
            {nestedPanel}
            {/* Standard value picker — hidden when a non-flat nested mode is active */}
            {(!isNestedAnnotation || nestedMode === "flat") &&
                (filterType === FilterType.DEFAULT || filterType === FilterType.FUZZY ? (
                    searchFormType()
                ) : (
                    <div className={styles.footer}>
                        All files with {filterType === FilterType.EXCLUDE ? "no " : "any "}
                        value for {props.annotation.displayName}
                    </div>
                ))}
        </div>
    );
}
