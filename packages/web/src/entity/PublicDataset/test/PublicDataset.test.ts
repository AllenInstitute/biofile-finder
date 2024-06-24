import { expect } from "chai";

import PublicDataset, { PublicDatasetProps } from "..";
import { FmsFileAnnotation } from "../../../../../core/services/FileService";

describe("PublicDataset", () => {
    describe("construct", () => {
        const mockDatasetAnnotations: FmsFileAnnotation[] = [
            {
                name: "Dataset name",
                values: ["Mock Dataset"],
            },
            {
                name: "File Path",
                values: ["fake-url.test"],
            },
            {
                name: "Size",
                values: ["1234"],
            },
            {
                name: "File count",
                values: ["98542"],
            },
        ];

        const mockDatasetDetails: PublicDatasetProps = {
            dataset_name: "Mock Dataset",
            dataset_path: "fake-url.test",
            dataset_size: "1234",
            file_count: "98542",
        };
        it("constructs a PublicDataset from only details and retrieves with getters", () => {
            const dataset = new PublicDataset(mockDatasetDetails, []);
            expect(dataset.name).to.equal(mockDatasetDetails.dataset_name);
            expect(dataset.path).to.equal(mockDatasetDetails.dataset_path);
            expect(dataset.details.dataset_size).to.equal(mockDatasetDetails.dataset_size);
            expect(dataset.details.file_count).to.equal(mockDatasetDetails.file_count);
        });

        it("constructs a PublicDataset from annotations", () => {
            const dataset = new PublicDataset(
                { dataset_name: "Mock Dataset" },
                mockDatasetAnnotations
            );
            expect(dataset.details).to.include(mockDatasetDetails);
        });
    });
});
