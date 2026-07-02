import { TextField } from "@fluentui/react";
import { isNil, isEmpty } from "lodash";
import * as React from "react";

import BaseComboBox from "../../ComboBox";
import { PipelineParameter } from "../../../entity/ComputePipeline";

import styles from "./ComputePipelineModal.module.css";

interface PipelineParameterInputProps {
    param: PipelineParameter;
    value: unknown;
    error: string;
    onChange: (value: unknown) => void;
    onBlur: () => void;
}

export default function PipelineParameterInput({
    param,
    value,
    error,
    onChange,
    onBlur,
}: PipelineParameterInputProps) {
    const renderControl = () => {
        switch (param.type) {
            case "select":
                return (
                    <BaseComboBox
                        label=""
                        selectedKey={!isNil(value) && !isEmpty(value) ? String(value) : null}
                        options={(param.options ?? []).map((o) => ({ key: o, text: o }))}
                        placeholder={
                            param.default !== null && param.default !== undefined
                                ? String(param.default)
                                : "Select an option"
                        }
                        onChange={(option) => onChange(option ? option.key : "")}
                    />
                );
            case "string":
                return (
                    <TextField
                        type="text"
                        value={!isNil(value) ? String(value) : ""}
                        onChange={(_, v) => onChange(v ?? "")}
                        onBlur={onBlur}
                        placeholder={param.default !== null ? String(param.default) : ""}
                        borderless
                        className={styles.textField}
                    />
                );
            case "number":
            default:
                return (
                    <TextField
                        type="number"
                        value={!isNil(value) ? String(value) : ""}
                        onChange={(_, v) => onChange(v ?? "")}
                        onBlur={onBlur}
                        placeholder={param.default !== null ? String(param.default) : ""}
                        borderless
                        className={styles.textField}
                    />
                );
        }
    };

    return (
        <div className={styles.paramField}>
            <div className={styles.paramLabel}>
                {param.label}
                {param.required && " *"}
            </div>
            <div className={styles.paramDesc}>{param.description}</div>
            {renderControl()}
            {error && <div className={styles.paramError}>{error}</div>}
        </div>
    );
}
