import { compact, map } from "lodash";

import HttpServiceBase, { ConnectionConfig } from "../HttpServiceBase";
import { defaultFileSetFactory } from "../../entity/FileSet/FileSetFactory";
import NumericRange, { JSONReadyRange } from "../../entity/NumericRange";
import FileService from "../FileService";

interface SelectionRequest {
    filters: {
        [index: string]: string | number | boolean;
    };
    indexRanges: JSONReadyRange[];
}

/**
 * TODO, FMS-1224 PART II
 */
export default class CsvService extends HttpServiceBase {
    public static BASE_CSV_DOWNLOAD_URL = `${FileService.BASE_FILES_URL}/selection/manifest`;

    public constructor(config: ConnectionConfig) {
        super(config);
    }

    public async downloadCsv(fileSetToSelectionMapping: {
        [index: string]: NumericRange[];
    }): Promise<void> {
        // TODO
        const postBody: SelectionRequest[] = compact(
            map(fileSetToSelectionMapping, (selections: NumericRange[], fileSetHash: string) => {
                const fileSet = defaultFileSetFactory.get(fileSetHash);
                if (!fileSet) {
                    return;
                }

                return {
                    filters: fileSet.filters.reduce((accum, filter) => {
                        return {
                            ...accum,
                            [filter.name]: filter.value,
                        };
                    }, {}),
                    indexRanges: selections.map((range) => range.toJSON()),
                };
            })
        );
    }
}
