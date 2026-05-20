import { TextField } from "@fluentui/react";
import * as React from "react";

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
    return (
        <div className={styles.paramField}>
            <div className={styles.paramLabel}>
                {param.label}
                {param.required && " *"}
            </div>
            <div className={styles.paramDesc}>{param.description}</div>
            <TextField
                type="number"
                value={value !== null && value !== undefined ? String(value) : ""}
                onChange={(_, v) => onChange(v ?? "")}
                onBlur={onBlur}
                placeholder={param.default !== null ? String(param.default) : ""}
                borderless
                className={styles.textField}
            />
            {error && <div className={styles.paramError}>{error}</div>}
        </div>
    );
}
