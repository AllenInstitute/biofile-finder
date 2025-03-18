import { ContextualMenuItemType, IContextualMenuItem } from "@fluentui/react";
import { useDispatch, useSelector } from "react-redux";

import FileFilter from "../entity/FileFilter";
import { interaction, selection } from "../state";

export default function useSaveMetadataOptions(
    filters?: FileFilter[],
    isSavingFullQuery?: boolean
): IContextualMenuItem[] {
    const dispatch = useDispatch();
    const isQueryingAicsFms = useSelector(selection.selectors.isQueryingAicsFms);

    const descriptor = !!isSavingFullQuery
        ? "containing the result of the current query"
        : "of the metadata of the selected files";

    return [
        {
            key: "save-as-header",
            text: "DATA SOURCE TYPES",
            title: "Types of data sources available for export",
            itemType: ContextualMenuItemType.Header,
        },
        {
            key: "csv",
            text: "CSV",
            title: `Download a CSV ${descriptor}`,
            onClick() {
                dispatch(interaction.actions.showManifestDownloadDialog("csv", filters));
            },
        },
        // Can't download JSON or Parquet files when querying AICS FMS
        ...(isQueryingAicsFms
            ? []
            : [
                  {
                      key: "json",
                      text: "JSON",
                      title: `Download a JSON file ${descriptor}`,
                      onClick() {
                          dispatch(interaction.actions.showManifestDownloadDialog("json", filters));
                      },
                  },
                  {
                      key: "parquet",
                      text: "Parquet",
                      title: `Download a Parquet file ${descriptor}`,
                      onClick() {
                          dispatch(
                              interaction.actions.showManifestDownloadDialog("parquet", filters)
                          );
                      },
                  },
              ]),
    ];
}
