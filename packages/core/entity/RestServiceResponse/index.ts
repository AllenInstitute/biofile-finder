export interface Response<T> {
    data: T[];
    offset: number;
    responseType: string;
    totalCount: number;
}

/**
 * A response from an AICS backend service. Intended to match the interface provided by the `api-response-java` library.
 * See https://aicsbitbucket.corp.alleninstitute.org/projects/SW/repos/api-response-java/browse.
 */
export default class RestServiceResponse<T = any> {
    private readonly response: Response<T>;

    constructor(response: Response<T>) {
        this.response = response;
    }

    get data(): T[] {
        return this.response.data;
    }

    get offset(): number {
        return this.response.offset;
    }

    get responseType(): string {
        return this.response.responseType;
    }
}
