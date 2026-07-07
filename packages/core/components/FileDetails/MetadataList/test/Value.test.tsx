import { render } from "@testing-library/react";
import { expect } from "chai";
import * as React from "react";
import sinon from "sinon";

import Value from "../Value";
import Annotation from "../../../../entity/Annotation";
import { AnnotationType } from "../../../../entity/AnnotationFormatter";

function makeAnnotation(overrides: Partial<{ type: AnnotationType; annotationName: string }> = {}) {
    return new Annotation({
        annotationName: [overrides.annotationName ?? "test"],
        description: "",
        type: overrides.type ?? AnnotationType.STRING,
    });
}

describe("<Value />", () => {
    it("renders plain text value when annotation is a string", () => {
        const { getByText } = render(
            <Value
                annotation={makeAnnotation()}
                value="hello world"
                isLongValue={false}
                isCollapsed={true}
                setIsCollapsed={sinon.stub()}
                onContextMenu={() => sinon.stub()}
            />
        );
        expect(getByText("hello world")).to.exist;
    });

    it("renders a link when annotation is an open-file-link type", () => {
        const annotation = new Annotation({
            annotationName: ["link"],
            description: "",
            type: AnnotationType.OPEN_FILE_LINK,
        });
        const { getByText } = render(
            <Value
                annotation={annotation}
                value="https://example.com"
                isLongValue={false}
                isCollapsed={true}
                setIsCollapsed={sinon.stub()}
                onContextMenu={() => sinon.stub()}
            />
        );
        const link = getByText("View link") as HTMLAnchorElement;
        expect(link.href).to.equal("https://example.com/");
        expect(link.target).to.equal("_blank");
    });

    it("shows ContentLengthToggle when value is long", () => {
        const { getByTestId } = render(
            <Value
                annotation={makeAnnotation()}
                value="long text"
                isLongValue={true}
                isCollapsed={true}
                setIsCollapsed={sinon.stub()}
                onContextMenu={() => sinon.stub()}
            />
        );
        expect(getByTestId("expand-nested-fields")).to.exist;
    });

    it("does not show ContentLengthToggle when value is short", () => {
        const { queryByTestId } = render(
            <Value
                annotation={makeAnnotation()}
                value="short"
                isLongValue={false}
                isCollapsed={true}
                setIsCollapsed={sinon.stub()}
                onContextMenu={() => sinon.stub()}
            />
        );
        expect(queryByTestId("expand-nested-fields")).not.to.exist;
        expect(queryByTestId("collapse-nested-fields")).not.to.exist;
    });
});
