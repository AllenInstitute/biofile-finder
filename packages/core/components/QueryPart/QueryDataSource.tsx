import * as React from "react";

import QueryPart from ".";
import { Collection } from "../../entity/FileExplorerURL";

interface Props {
    dataSources: (Collection | undefined)[];
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
                // Undefined data source must mean we are querying AICS FMS
                // we should have a more sentinal value for this
                if (!dataSource) {
                    return {
                        id: "AICS FMS",
                        title: "AICS FMS",
                    };
                }

                return {
                    id: `${dataSource.name} ${dataSource.version}`,
                    title: dataSource.name,
                };
            })}
        />
    );
}
