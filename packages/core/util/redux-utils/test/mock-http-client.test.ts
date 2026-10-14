// Migrated from https://github.com/AllenCellSoftware/redux-utils (archived Nov 2025)
import { expect } from "chai";

import { createMockHttpClient, ResponseStub } from "..";

describe("createMockHttpClient", () => {
    it("intercepts all HTTP requests", async () => {
        const httpClient = createMockHttpClient();

        expect(await httpClient.get("https://www.google.com")).to.haveOwnProperty(
            "statusText",
            "MOCK"
        );
    });

    it("applies a ResponseStub given a matching URL", async () => {
        const responseStub = {
            when: "/api/1.0/foo/bar",
            respondWith: { data: "Hello from the endpoint" },
        };

        const httpClient = createMockHttpClient(responseStub);

        expect(await httpClient.get("/api/1.0/foo/bar")).to.haveOwnProperty(
            "data",
            "Hello from the endpoint"
        );

        expect(await httpClient.get("/api/2.0/foo/bar")).to.not.haveOwnProperty(
            "data",
            "Hello from the endpoint"
        );
    });

    it("applies a ResponseStub given a matcher function", async () => {
        const responseStub: ResponseStub = {
            when: (config) => config.method === "head",
            respondWith: { data: "Hello from the endpoint" },
        };

        const httpClient = createMockHttpClient(responseStub);

        expect(await httpClient.head("/api/1.0/foo/bar")).to.haveOwnProperty(
            "data",
            "Hello from the endpoint"
        );

        expect(await httpClient.get("/api/1.0/foo/bar")).to.not.haveOwnProperty(
            "data",
            "Hello from the endpoint"
        );
    });

    it("applies the same ResponseStub to repeated HTTP requests to same URL if only given one matching ResponseStub", async () => {
        const responseStub = {
            when: "/api/1.0/foo/bar",
            respondWith: { data: "Hello from the endpoint" },
        };

        const httpClient = createMockHttpClient(responseStub);

        expect(await httpClient.get("/api/1.0/foo/bar")).to.haveOwnProperty(
            "data",
            "Hello from the endpoint"
        );

        expect(await httpClient.get("/api/1.0/foo/bar")).to.haveOwnProperty(
            "data",
            "Hello from the endpoint"
        );
    });

    it("applies ResponseStubs in order if given multiple to handle the same URL", async () => {
        const responseStub1 = {
            when: "/api/1.0/foo/bar",
            respondWith: { data: "Hello from the endpoint" },
        };

        const responseStub2 = {
            when: "/api/1.0/foo/bar",
            respondWith: { data: "Goodbye from the endpoint" },
        };

        const httpClient = createMockHttpClient([responseStub1, responseStub2]);

        expect(await httpClient.get("/api/1.0/foo/bar")).to.haveOwnProperty(
            "data",
            "Hello from the endpoint"
        );

        expect(await httpClient.get("/api/1.0/foo/bar")).to.haveOwnProperty(
            "data",
            "Goodbye from the endpoint"
        );
    });

    it("applies the last ResponseStub given if more calls to the same URL are made than ResponseStubs are provided", async () => {
        const responseStub1 = {
            when: "/api/1.0/foo/bar",
            respondWith: { data: "Hello from the endpoint" },
        };

        const responseStub2 = {
            when: "/api/1.0/foo/bar",
            respondWith: { data: "Goodbye from the endpoint" },
        };

        const httpClient = createMockHttpClient([responseStub1, responseStub2]);

        expect(await httpClient.get("/api/1.0/foo/bar")).to.haveOwnProperty(
            "data",
            "Hello from the endpoint"
        );

        expect(await httpClient.get("/api/1.0/foo/bar")).to.haveOwnProperty(
            "data",
            "Goodbye from the endpoint"
        );

        expect(await httpClient.get("/api/1.0/foo/bar")).to.haveOwnProperty(
            "data",
            "Goodbye from the endpoint"
        );

        expect(await httpClient.get("/api/1.0/foo/bar")).to.haveOwnProperty(
            "data",
            "Goodbye from the endpoint"
        );
    });
});
