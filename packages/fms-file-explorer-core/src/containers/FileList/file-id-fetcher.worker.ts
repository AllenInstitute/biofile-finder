/**
 * Responsible for making HTTP requests to our query service for file ids that match a given set of filters.
 */
import "regenerator-runtime/runtime";

import RestServiceResponse from "../../entity/RestServiceResponse";

const ctx: Worker = self as any;

async function getFileIds(queryString: string) {
    let page = 0;

    const fetch = (): Promise<RestServiceResponse<string>> => {
        return new Promise((resolve) => {
            setTimeout(() => {
                console.log(`Requesting file ids from page ${page}`);
                const res = require(`../../../assets/file-ids-${page}.json`);
                page += 1;
                resolve(new RestServiceResponse(res));
            }, 750);
        });
    };

    const fileIds: string[] = [];
    let res = await fetch();
    res.data.forEach((id) => fileIds.push(id));
    while (res.hasMore) {
        res = await fetch();
        res.data.forEach((id) => fileIds.push(id));
    }

    return fileIds;
}

// GLUE CODE
ctx.addEventListener("message", async (msg: MessageEvent) => {
    // msg.data is expected to be a query string
    const fileIds = await getFileIds(msg.data);
    ctx.postMessage({
        queryString: msg.data,
        fileIds,
    });
});
