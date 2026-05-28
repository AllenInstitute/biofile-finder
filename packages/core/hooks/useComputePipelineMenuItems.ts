import { IContextualMenuItem } from "@fluentui/react";
import * as React from "react";
import { useDispatch, useSelector } from "react-redux";

import { ModalType } from "../components/Modal";
import { Pipeline } from "../entity/ComputePipeline";
import FileFilter from "../entity/FileFilter";
import { interaction } from "../state";

/**
 * Fetches available pipelines and returns one submenu item per pipeline for
 * the "Run Compute Pipeline" context menu entry. Returns an empty array while
 * loading and a single disabled item on error.
 */
export default function useComputePipelineMenuItems(
    folderFilters?: FileFilter[]
): IContextualMenuItem[] {
    const dispatch = useDispatch();
    const pipelineService = useSelector(interaction.selectors.getPipelineService);

    const [pipelines, setPipelines] = React.useState<Pipeline[] | null>(null);
    const [loadFailed, setLoadFailed] = React.useState(false);

    // Fetch pipelines once — intentionally excludes folderFilters so filter
    // changes don't trigger duplicate network calls.
    React.useEffect(() => {
        let cancelled = false;
        pipelineService
            .getPipelines()
            .then((result) => {
                if (!cancelled) setPipelines(result);
            })
            .catch(() => {
                if (!cancelled) setLoadFailed(true);
            });
        return () => {
            cancelled = true;
        };
    }, [pipelineService]);

    // Rebuild menu items whenever pipelines or folderFilters change.
    return React.useMemo(() => {
        if (loadFailed) {
            return [{ key: "pipelines-error", text: "Failed to load pipelines", disabled: true }];
        }
        if (pipelines === null) {
            return [{ key: "pipelines-loading", text: "Loading pipelines...", disabled: true }];
        }
        if (pipelines.length === 0) {
            return [{ key: "no-pipelines", text: "No pipelines available", disabled: true }];
        }
        return pipelines.map((pipeline) => ({
            key: pipeline.id,
            text: pipeline.name,
            title: pipeline.description,
            onClick() {
                dispatch(
                    interaction.actions.setVisibleModal(
                        ModalType.ComputePipeline,
                        folderFilters,
                        pipeline.id
                    )
                );
            },
        }));
    }, [pipelines, loadFailed, folderFilters, dispatch]);
}
