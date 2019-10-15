import axios, { AxiosInstance, AxiosResponse, AxiosRequestConfig } from "axios";
import { castArray } from "lodash";

export interface ResponseStub {
    // A URL to match against or a function that, given AxiosRequestConfig, returns true or false.
    when: string | ((config: AxiosRequestConfig) => boolean);

    // A whole or partial response that corresponds to the AxiosResponse interface. It is shallowly merged with a stub
    // object that also corresponds to the AxiosResponse interface for the purpose of avoiding needed to declare the
    // full AxiosReponse interface when created a ResponseStub.
    respondWith: Partial<AxiosResponse>;
}

/**
 * Returns a stubbed version of axios that intercepts all outgoing HTTP requests. It can be provided with one or many
 * ResponseStubs, which define a request to stub and the expected response. It will use the first matching ResponseStub,
 * so in that way the ResponseStubs are order dependent. E.g., if two ResponseStubs are provided that have the same
 * `when` condition, only the first will be applied if a request matches that `when`.
 *
 * Example:
 *
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
 *
 */
export default function mockHttpClient(responseStub: ResponseStub | ResponseStub[]): AxiosInstance {
    return axios.create({
        adapter(config: AxiosRequestConfig) {
            return new Promise((resolve) => {
                let response: AxiosResponse = {
                    data: [],
                    headers: {},
                    status: 200,
                    statusText: "OK",
                    config,
                };

                castArray(responseStub).some((stubConfig) => {
                    if (stubConfig.when === config.url) {
                        response = Object.assign({}, response, stubConfig.respondWith);
                        return true;
                    }
                });

                resolve(response);
            });
        },
    });
}
