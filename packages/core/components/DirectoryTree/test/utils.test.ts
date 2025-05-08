import { createMockHttpClient, ResponseStub } from "@aics/redux-utils";
import { expect } from "chai";
import { get as _get, pick } from "lodash";

import { NO_VALUE_NODE } from "../directory-hierarchy-state";
import { findChildNodes } from "../findChildNodes";
import { calcNodeSortOrder } from "../useDirectoryHierarchy";
import { FESBaseUrl } from "../../../constants";
import Annotation from "../../../entity/Annotation";
import { AnnotationType } from "../../../entity/AnnotationFormatter";
import ExcludeFilter from "../../../entity/FileFilter/ExcludeFilter";
import IncludeFilter from "../../../entity/FileFilter/IncludeFilter";
import FileFilter from "../../../entity/FileFilter";
import FileSet from "../../../entity/FileSet";
import HttpAnnotationService from "../../../services/AnnotationService/HttpAnnotationService";
import HttpFileService from "../../../services/FileService/HttpFileService";
import FileDownloadServiceNoop from "../../../services/FileDownloadService/FileDownloadServiceNoop";

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
            type: AnnotationType.STRING,
        });
        const secondAnn = new Annotation({
            annotationDisplayName: "Annotation2",
            annotationName: "annotation2",
            description: "",
            type: AnnotationType.STRING,
        });
        const numericAnn = new Annotation({
            annotationDisplayName: "NumericAnn",
            annotationName: "numericAnn",
            description: "",
            type: AnnotationType.NUMBER,
        });
        const noValueAnnotation = "NoValueAnn";
        const topLevelHierarchyValues = ["first", "second", "third", "fourth"];
        const secondLevelHierarchyValues = ["a", "b", "c"];
        const numericHierarchyValues = [1, 2, 3, 4, 5];
        const responseStubs: ResponseStub[] = [
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
                when: (config) => {
                    const url = _get(config, "url", "");
                    return (
                        url.includes(
                            `${FESBaseUrl.TEST}/${HttpAnnotationService.BASE_ANNOTATION_HIERARCHY_UNDER_PATH_URL}`
                        ) && url.includes(`order=${numericAnn.displayName}`)
                    );
                },
                respondWith: {
                    data: { data: numericHierarchyValues },
                },
            },
            {
                when: (config) =>
                    _get(config, "url", "").includes(
                        `${HttpAnnotationService.BASE_ANNOTATION_HIERARCHY_ROOT_URL}?order=${noValueAnnotation}`
                    ),
                respondWith: {
                    data: { data: [] },
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
            {
                when: (config) => {
                    const url = _get(config, "url", "");
                    return (
                        url.includes(`${FESBaseUrl.TEST}/${HttpFileService.BASE_FILE_COUNT_URL}`) &&
                        url.includes(`exclude=${secondAnn.displayName}`)
                    );
                },
                respondWith: {
                    data: { data: [10] },
                },
            },
            {
                when: `${FESBaseUrl.TEST}/${HttpFileService.BASE_FILE_COUNT_URL}?exclude=${noValueAnnotation}`,
                respondWith: {
                    data: { data: [0] },
                },
            },
        ];
        const mockHttpClient = createMockHttpClient(responseStubs);
        const annotationService = new HttpAnnotationService({
            fileExplorerServiceBaseUrl: FESBaseUrl.TEST,
            httpClient: mockHttpClient,
        });
        const fileService = new HttpFileService({
            downloadService: new FileDownloadServiceNoop(),
            fileExplorerServiceBaseUrl: FESBaseUrl.TEST,
            httpClient: mockHttpClient,
        });
        const hierarchy = [firstAnn.displayName, secondAnn.displayName];

        it('finds child nodes without "showNullValue" applied', async () => {
            const fileSet = new FileSet({ filters: [] });
            const childNodes = await findChildNodes({
                annotationService,
                fileService,
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
                fileService,
                currentNode: firstAnn.displayName,
                hierarchy,
                shouldShowNullGroups: true,
                fileSet,
            });
            expect(childNodes.includes(NO_VALUE_NODE)).to.be.true;
        });
        it("excludes the NO_VALUE node when no files exist for that node", async () => {
            const fileSet = new FileSet({ filters: [] });
            const childNodes = await findChildNodes({
                annotationService,
                fileService,
                currentNode: firstAnn.displayName,
                hierarchy: [firstAnn.displayName, noValueAnnotation],
                shouldShowNullGroups: true,
                fileSet,
            });
            expect(childNodes.includes(NO_VALUE_NODE)).to.be.false;
        });
        it("excludes the NO_VALUE node when annotation has filter applied", async () => {
            const fileSet = new FileSet({
                filters: [new FileFilter(secondAnn.displayName, secondLevelHierarchyValues[1])],
            });
            const childNodes = await findChildNodes({
                annotationService,
                fileService,
                currentNode: firstAnn.displayName,
                hierarchy,
                shouldShowNullGroups: true,
                fileSet,
            });
            expect(childNodes.includes(NO_VALUE_NODE)).to.be.false;
            expect(childNodes).to.deep.equal([secondLevelHierarchyValues[1]]);
        });
        it("returns only the NO_VALUE node when annotation has exclude filter applied and NO_VALUE has files", async () => {
            const fileSet = new FileSet({ filters: [new ExcludeFilter(secondAnn.displayName)] });
            const childNodes = await findChildNodes({
                annotationService,
                fileService,
                currentNode: firstAnn.displayName,
                hierarchy,
                shouldShowNullGroups: true,
                fileSet,
            });
            expect(childNodes.includes(NO_VALUE_NODE)).to.be.true;
            expect(childNodes.length).to.equal(1);
        });
        it("returns all appropriate values when range is applied", async () => {
            const fileSet = new FileSet({
                filters: [new FileFilter(numericAnn.displayName, "RANGE(1,5)")],
            });
            const childNodes = await findChildNodes({
                annotationService,
                fileService,
                currentNode: numericAnn.displayName,
                hierarchy: [firstAnn.displayName, numericAnn.displayName],
                shouldShowNullGroups: false,
                fileSet,
            });
            expect(childNodes).to.deep.equal(numericHierarchyValues);
        });
        it("returns all values when 'include' filter is applied on hierarchy field", async () => {
            const fileSet = new FileSet({ filters: [new IncludeFilter(secondAnn.displayName)] });
            const childNodes = await findChildNodes({
                annotationService,
                fileService,
                currentNode: firstAnn.displayName,
                hierarchy,
                shouldShowNullGroups: false,
                fileSet,
            });
            expect(childNodes).to.deep.equal(secondLevelHierarchyValues);
        });
    });
});
