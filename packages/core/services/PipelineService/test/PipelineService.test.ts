import { AxiosInstance } from "axios";
import { expect } from "chai";

import PipelineService from "..";
import { JSSBaseUrl } from "../../../constants";
import { ComputeTaskRequest } from "../../../entity/ComputePipeline";

describe("PipelineService", () => {
    const jssBaseUrl = JSSBaseUrl.TEST;

    const request: ComputeTaskRequest = {
        pipeline: "ome-zarr-conversion",
        cluster: "SLURM",
        destination: "FMS",
        user: "first.last",
        filePaths: ["/allen/some/file.czi"],
        parameters: {},
    };

    function createRejectingHttpClient(rejectionValue: unknown): AxiosInstance {
        return ({
            defaults: { headers: { common: {} } },
            post: () => Promise.reject(rejectionValue),
        } as unknown) as AxiosInstance;
    }

    describe("submitComputeTask", () => {
        it("surfaces the server's 'error' detail on a failed submission", async () => {
            // Arrange
            const httpClient = createRejectingHttpClient({
                isAxiosError: true,
                response: {
                    status: 400,
                    data: {
                        error: "Validation failure: filePaths - size must be between 1 and 150",
                    },
                },
            });
            const service = new PipelineService({ jssBaseUrl, httpClient });

            // Act / Assert
            try {
                await service.submitComputeTask(request);
                expect(false, "Expected to throw").to.be.true;
            } catch (e) {
                expect((e as Error).message).to.equal(
                    "Validation failure: filePaths - size must be between 1 and 150"
                );
            }
        });

        it("rethrows errors as is, if they don't have an 'error' property", async () => {
            // Arrange
            const original = new Error("Network Error");
            const httpClient = createRejectingHttpClient(original);
            const service = new PipelineService({ jssBaseUrl, httpClient });

            // Act / Assert
            try {
                await service.submitComputeTask(request);
                expect(false, "Expected to throw").to.be.true;
            } catch (e) {
                expect(e).to.equal(original);
            }
        });
    });
});
