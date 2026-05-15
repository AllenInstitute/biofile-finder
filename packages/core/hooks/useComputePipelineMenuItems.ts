import { IContextualMenuItem } from "@fluentui/react";
import * as React from "react";
import { useDispatch, useSelector } from "react-redux";

import { ModalType } from "../components/Modal";
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

    const [items, setItems] = React.useState<IContextualMenuItem[]>([
        { key: "pipelines-loading", text: "Loading pipelines...", disabled: true },
    ]);

    React.useEffect(() => {
        let cancelled = false;
        pipelineService
            .getPipelines()
            .then((pipelines) => {
                if (cancelled) return;
                if (pipelines.length === 0) {
                    setItems([
                        { key: "no-pipelines", text: "No pipelines available", disabled: true },
                    ]);
                    return;
                }
                setItems(
                    pipelines.map((pipeline) => ({
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
                    }))
                );
            })
            .catch(() => {
                if (!cancelled) {
                    setItems([
                        {
                            key: "pipelines-error",
                            text: "Failed to load pipelines",
                            disabled: true,
                        },
                    ]);
                }
            });
        return () => {
            cancelled = true;
        };
    }, [dispatch, folderFilters, pipelineService]);

    return items;
}
