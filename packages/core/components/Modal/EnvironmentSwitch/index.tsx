import * as React from "react";
import { useDispatch, useSelector } from "react-redux";

import { ModalProps } from "..";
import BaseModal from "../BaseModal";
import { PrimaryButton, SecondaryButton } from "../../Buttons";
import ComboBox from "../../ComboBox";
import {
    DatasetBucketUrl,
    Environment,
    EnvironmentOverrides,
    FESBaseUrl,
    FileStorageServiceBaseUrl,
    JSSBaseUrl,
    LabKeyBaseUrl,
    MMSBaseUrl,
    OverridableService,
    VolEBaseUrl,
} from "../../../constants";
import { interaction } from "../../../state";

import styles from "./EnvironmentSwitch.module.css";

interface ServiceDescriptor {
    key: OverridableService;
    label: string;
    urls: Record<Environment, string>;
}

const SERVICES: ServiceDescriptor[] = [
    {
        key: OverridableService.FileExplorerService,
        label: "File Explorer Service (FES)",
        urls: FESBaseUrl,
    },
    {
        key: OverridableService.MetadataManagementService,
        label: "Metadata Management Service (MMS)",
        urls: MMSBaseUrl,
    },
    {
        key: OverridableService.FileStorageService,
        label: "File Storage Service (FSS2)",
        urls: FileStorageServiceBaseUrl,
    },
    {
        key: OverridableService.JobStatusService,
        label: "Job Status Service (JSS)",
        urls: JSSBaseUrl,
    },
    {
        key: OverridableService.LabKey,
        label: "LabKey (Plate UI links)",
        urls: LabKeyBaseUrl,
    },
    {
        key: OverridableService.DatasetBucket,
        label: "Dataset Bucket (S3)",
        urls: DatasetBucketUrl,
    },
    {
        key: OverridableService.VolE,
        label: "Vol-E Viewer",
        urls: VolEBaseUrl,
    },
];

const ENVIRONMENT_OPTIONS = Object.values(Environment).map((env) => ({
    key: env,
    text: env,
}));

export default function EnvironmentSwitch({ onDismiss }: ModalProps) {
    const dispatch = useDispatch();
    const environment = useSelector(interaction.selectors.getEnvironment) as Environment;
    const overrides = useSelector(interaction.selectors.getEnvironmentOverrides);

    const [draft, setDraft] = React.useState<Record<OverridableService, Environment>>(() =>
        SERVICES.reduce(
            (accum, service) => ({
                ...accum,
                [service.key]: overrides[service.key] ?? environment,
            }),
            {} as Record<OverridableService, Environment>
        )
    );

    const hasChanges = SERVICES.some(
        (service) => draft[service.key] !== (overrides[service.key] ?? environment)
    );

    // Selected key for the "all services" shortcut; null when services differ
    const environmentForAllServices = SERVICES.every(
        (service) => draft[service.key] === draft[SERVICES[0].key]
    )
        ? draft[SERVICES[0].key]
        : null;

    const onSelectAll = (env: Environment) => {
        setDraft(
            SERVICES.reduce(
                (accum, service) => ({ ...accum, [service.key]: env }),
                {} as Record<OverridableService, Environment>
            )
        );
    };

    const onSelectService = (key: OverridableService, env: Environment) => {
        setDraft((prev) => ({ ...prev, [key]: env }));
    };

    const onApply = () => {
        const newOverrides: EnvironmentOverrides = {};
        SERVICES.forEach((service) => {
            if (draft[service.key] !== environment) {
                newOverrides[service.key] = draft[service.key];
            }
        });
        dispatch(interaction.actions.setEnvironmentOverrides(newOverrides));
        dispatch(interaction.actions.refresh());
        onDismiss();
    };

    const body = (
        <div>
            <p className={styles.text}>
                Point individual services at a different environment for this session. Services left
                at the app default (<strong>{environment}</strong>) will continue to follow it.
            </p>
            <div className={styles.allServicesRow}>
                <ComboBox
                    label="All services"
                    placeholder="(mixed)"
                    options={ENVIRONMENT_OPTIONS}
                    selectedKey={environmentForAllServices}
                    onChange={(option) => option && onSelectAll(option.key as Environment)}
                />
            </div>
            {SERVICES.map((service) => (
                <div className={styles.serviceRow} key={service.key}>
                    <ComboBox
                        label={service.label}
                        placeholder=""
                        options={ENVIRONMENT_OPTIONS}
                        selectedKey={draft[service.key]}
                        onChange={(option) =>
                            option && onSelectService(service.key, option.key as Environment)
                        }
                    />
                    <code className={styles.url}>{service.urls[draft[service.key]]}</code>
                </div>
            ))}
        </div>
    );

    const footer = (
        <div className={styles.footer}>
            <SecondaryButton
                text="RESET TO DEFAULT"
                title={`Reset all services to ${environment}`}
                onClick={() => onSelectAll(environment)}
            />
            <PrimaryButton
                disabled={!hasChanges}
                text="APPLY"
                title="Apply environment changes and refresh"
                onClick={onApply}
            />
        </div>
    );

    return (
        <BaseModal
            body={body}
            footer={footer}
            onDismiss={onDismiss}
            title="Service environments (dev)"
        />
    );
}
