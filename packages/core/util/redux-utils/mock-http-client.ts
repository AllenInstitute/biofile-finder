// Migrated from https://github.com/AllenCellSoftware/redux-utils (archived Nov 2025)
import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from "axios";
import { castArray, filter, isFunction, last } from "lodash";

export interface ResponseStub {
    // A (string) URL to match against or a function that, given AxiosRequestConfig, returns true or false.
    when: string | ((config: AxiosRequestConfig) => boolean);

    // A whole or partial response that corresponds to the AxiosResponse interface. It is shallowly merged with a stub
    // object that also corresponds to the AxiosResponse interface for the purpose of avoiding needed to declare the
    // full AxiosReponse interface when created a ResponseStub.
    respondWith: Partial<AxiosResponse>;
}

/**
 * Returns a stubbed Axios instance that intercepts all outgoing HTTP requests. It can be provided with one or many
 * ResponseStubs, which define a request to stub and the expected response.
 *
 * If given multiple ResponseStubs intended to match the same request, it applies the first matching ResponseStub to
 * the first corresponding outbound request, then the second matching ResponseStub to the second corresponding outbound request, etc.
 *
 * It continuously applies the last matching ResponseStub if more corresponding outbound requests are made than ResponseStubs are provided.
 *
 * Example:
 *```typescript
 * const responseStubs: ResponseStub[] = [
 *  {
 *      when: "/api/1.0/foo/bar",
 *      respondWith: { data: "Hello from the endpoint" }
 *  },
 *  {
 *      when: (config: AxiosRequestConfig) => includes(config.headers, { "content-type": "application/json" }),
 *      respondWith: { status: 406, statusText: "Nope" }
 *  }
 * ];
 *
 * const httpClient = mockHttpClient(responseStubs);
 *```
 */
export default function createMockHttpClient(
    responseStub?: ResponseStub | ResponseStub[]
): AxiosInstance {
    const urlToRequestCountMap = new Map<string, number>();

    return axios.create({
        adapter(config: AxiosRequestConfig) {
            return new Promise((resolve) => {
                let response: AxiosResponse = {
                    data: [],
                    headers: {},
                    status: 200,
                    statusText: "MOCK",
                    config,
                };

                if (responseStub && config.url) {
                    // If more than one ResponseStub was created for the same URL, attempt to match the current HTTP request with its corresponding
                    // ResponseStub, as determined by index position within provided responseStub array
                    const stubsForUrl = filter(castArray(responseStub), (stubConfig) =>
                        isFunction(stubConfig.when)
                            ? stubConfig.when(config)
                            : stubConfig.when === config.url
                    );

                    const precedingRequestsToSameUrlCount =
                        urlToRequestCountMap.get(config.url) || 0;
                    const currentRequestsToSameUrlCount = precedingRequestsToSameUrlCount + 1;

                    // update count of times URL has been called
                    urlToRequestCountMap.set(config.url, currentRequestsToSameUrlCount);

                    let stubConfig;
                    if (currentRequestsToSameUrlCount > stubsForUrl.length) {
                        stubConfig = last(stubsForUrl);
                    } else {
                        stubConfig = stubsForUrl[currentRequestsToSameUrlCount - 1]; // account for 0-indexing
                    }

                    if (stubConfig) {
                        response = Object.assign({}, response, stubConfig.respondWith);
                    }
                }

                resolve(response);
            });
        },
    });
}
