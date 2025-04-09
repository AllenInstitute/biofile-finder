import { createMockHttpClient, ResponseStub } from "@aics/redux-utils";
import { expect } from "chai";
import { get as _get, pick } from "lodash";

import { NO_VALUE_NODE } from "../directory-hierarchy-state";
import { findChildNodes } from "../findChildNodes";
import { calcNodeSortOrder } from "../useDirectoryHierarchy";
import { FESBaseUrl } from "../../../constants";
import Annotation from "../../../entity/Annotation";
import ExcludeFilter from "../../../entity/FileFilter/ExcludeFilter";
import FileSet from "../../../entity/FileSet";
import FileFilter from "../../../entity/FileFilter";
import HttpAnnotationService from "../../../services/AnnotationService/HttpAnnotationService";

describe("DirectoryTree utilities", () => {
    describe("calcNodeSortOrder", () => {
        [
            {
                idxWithinSourceList: 2,
                parentDepth: 1,
                parentSortOrder: 2,
                sourceListLength: 4,
                expectation: 2.2,
            },
            {
                idxWithinSourceList: 298,
                parentDepth: 1,
                parentSortOrder: 2,
                sourceListLength: 400,
                expectation: 2.298,
            },
            {
                idxWithinSourceList: 1,
                parentDepth: 3,
                parentSortOrder: 1,
                sourceListLength: 2,
                expectation: 1.0001,
            },
            {
                idxWithinSourceList: 0,
                parentDepth: 5,
                parentSortOrder: 7,
                sourceListLength: 200,
                expectation: 7,
            },
            {
                idxWithinSourceList: 123,
                parentDepth: 5,
                parentSortOrder: 7,
                sourceListLength: 200,
                expectation: 7.00000123,
            },
        ].forEach((spec, idx) => {
            it(`(${idx}) calculates the correct node sort order`, () => {
                // Arrange
                const params = pick(spec, [
                    "idxWithinSourceList",
                    "parentDepth",
                    "parentSortOrder",
                    "sourceListLength",
                ]);

                // Act
                const sortOrder = calcNodeSortOrder(params);

                // Assert
                expect(sortOrder).to.equal(spec.expectation);
            });
        });
    });
    describe("findChildNodes", () => {
        // Create mock annotations and hierarchy
        const firstAnn = new Annotation({
            annotationDisplayName: "Annotation1",
            annotationName: "annotation1",
            description: "",
            type: "Text",
        });
        const secondAnn = new Annotation({
            annotationDisplayName: "Annotation2",
            annotationName: "annotation2",
            description: "",
            type: "Text",
        });
        const topLevelHierarchyValues = ["first", "second", "third", "fourth"];
        const secondLevelHierarchyValues = ["a", "b", "c"];
        const responseStubs: ResponseStub[] = [
            {
                when: (config) =>
                    _get(config, "url", "").includes(
                        `&path=${firstAnn.displayName}&filter=${firstAnn.displayName}=fourth&filter=${firstAnn.displayName}=fourth`
                    ),
                respondWith: {
                    data: {
                        data: ["Incorrect"], // This is an intentional dud, we should not hit this endpoint
                    },
                },
            },
            {
                when: (config) =>
                    _get(config, "url", "").includes(
                        `&path=${firstAnn.displayName}&filter=${firstAnn.displayName}=fourth`
                    ),
                respondWith: {
                    data: {
                        data: ["Correct"],
                    },
                },
            },
            {
                when: (config) =>
                    _get(config, "url", "").includes(
                        `${HttpAnnotationService.BASE_ANNOTATION_HIERARCHY_ROOT_URL}?order=${firstAnn.displayName}`
                    ),
                respondWith: {
                    data: { data: topLevelHierarchyValues },
                },
            },
            {
                when: (config) =>
                    _get(config, "url", "").includes(
                        `${HttpAnnotationService.BASE_ANNOTATION_HIERARCHY_ROOT_URL}?order=${secondAnn.displayName}`
                    ),
                respondWith: {
                    data: { data: secondLevelHierarchyValues },
                },
            },
            {
                when: `${FESBaseUrl.TEST}/file-explorer-service/1.0/annotations/${firstAnn.name}/values`,
                respondWith: {
                    data: { data: topLevelHierarchyValues },
                },
            },
            {
                when: (config) =>
                    _get(config, "url", "").includes(
                        `${HttpAnnotationService.BASE_ANNOTATION_HIERARCHY_UNDER_PATH_URL}?order=${firstAnn.displayName}&order=${secondAnn.displayName}&path=${firstAnn.displayName}`
                    ),
                respondWith: {
                    data: {
                        data: secondLevelHierarchyValues,
                    },
                },
            },
        ];
        const mockHttpClient = createMockHttpClient(responseStubs);
        const annotationService = new HttpAnnotationService({
            fileExplorerServiceBaseUrl: FESBaseUrl.TEST,
            httpClient: mockHttpClient,
        });
        const hierarchy = [firstAnn.displayName, secondAnn.displayName];

        it('finds child nodes without "showNullValue" applied', async () => {
            const fileSet = new FileSet({ filters: [] });
            const childNodes = await findChildNodes({
                annotationService,
                currentNode: firstAnn.displayName,
                hierarchy,
                shouldShowNullGroups: false,
                fileSet,
            });
            expect(childNodes.includes(NO_VALUE_NODE)).to.be.false;
            expect(childNodes).to.deep.equal(secondLevelHierarchyValues);
        });
        it("includes the NO_VALUE node when showNullValue is applied", async () => {
            const fileSet = new FileSet({ filters: [] });
            const childNodes = await findChildNodes({
                annotationService,
                currentNode: firstAnn.displayName,
                hierarchy,
                shouldShowNullGroups: true,
                fileSet,
            });
            expect(childNodes.includes(NO_VALUE_NODE)).to.be.true;
        });
        it("excludes the NO_VALUE node when annotation has filter applied", async () => {
            const fileSet = new FileSet({
                filters: [new FileFilter(secondAnn.displayName, secondLevelHierarchyValues[1])],
            });
            const childNodes = await findChildNodes({
                annotationService,
                currentNode: firstAnn.displayName,
                hierarchy,
                shouldShowNullGroups: true,
                fileSet,
            });
            expect(childNodes.includes(NO_VALUE_NODE)).to.be.false;
            expect(childNodes).to.deep.equal([secondLevelHierarchyValues[1]]);
        });
        it("returns only the NO_VALUE node when annotation has exclude filter applied", async () => {
            const fileSet = new FileSet({ filters: [new ExcludeFilter(secondAnn.displayName)] });
            const childNodes = await findChildNodes({
                annotationService,
                currentNode: firstAnn.displayName,
                hierarchy,
                shouldShowNullGroups: true,
                fileSet,
            });
            expect(childNodes.includes(NO_VALUE_NODE)).to.be.true;
            expect(childNodes.length).to.equal(1);
        });
        // it("combines duplicate filters", async () => {
        //     const firstAnnFilter = new FileFilter(firstAnn.displayName, topLevelHierarchyValues[3]);
        //     const fileSet = new FileSet({ filters: [firstAnnFilter] });
        //     const childNodes = await findChildNodes({
        //         annotationService,
        //         currentNode: firstAnn.displayName,
        //         fileSet,
        //         hierarchy,
        //         shouldShowNullGroups: false,
        //     });
        //     expect(childNodes).to.deep.equal(["Correct"]);
        // });
    });
});
