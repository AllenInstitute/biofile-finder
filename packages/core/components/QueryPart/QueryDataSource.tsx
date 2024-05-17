import * as React from "react";

import QueryPart from ".";
import { AICS_FMS_DATA_SOURCE_NAME } from "../../constants";
import { Source } from "../../entity/FileExplorerURL";

interface Props {
    dataSources: (Source | undefined)[];
}

/**
 * Component responsible for rendering the "Data Source" part of the query
 */
export default function QueryDataSource(props: Props) {
    return (
        <QueryPart
            title="Data Source"
            addButtonIconName="Folder"
            onRenderAddMenuList={() => <div>TODO: To be implemented in another ticket</div>}
            rows={props.dataSources.map((dataSource) => {
                // TODO: This should change when we move towards
                // having a blank data source only possible
                // on an empty load
                // https://github.com/AllenInstitute/aics-fms-file-explorer-app/issues/105
                if (!dataSource) {
                    return {
                        id: AICS_FMS_DATA_SOURCE_NAME,
                        title: AICS_FMS_DATA_SOURCE_NAME,
                    };
                }

                return {
                    id: dataSource.name,
                    title: dataSource.name,
                };
            })}
        />
    );
}
