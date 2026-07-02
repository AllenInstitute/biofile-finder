import { TextField } from "@fluentui/react";
import { isEmpty } from "lodash";
import * as React from "react";

import BaseComboBox from "../../ComboBox";
import { PipelineParameter } from "../../../entity/ComputePipeline";

import styles from "./ComputePipelineModal.module.css";

interface PipelineParameterInputProps {
    param: PipelineParameter;
    value: string;
    error: string;
    onChange: (value: string) => void;
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
                        selectedKey={!isEmpty(value) ? value : null}
                        options={(param.options ?? []).map((o) => ({ key: o, text: o }))}
                        placeholder={
                            param.default !== null ? String(param.default) : "Select an option"
                        }
                        onChange={(option) => onChange(option ? String(option.key) : "")}
                    />
                );
            case "string":
                return (
                    <TextField
                        type="text"
                        value={value}
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
                        value={value}
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
