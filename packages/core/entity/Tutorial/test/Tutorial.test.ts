import { expect } from "chai";

import Tutorial from "..";

describe("Tutorial", () => {
    describe("hasStep", () => {
        const tutorial = new Tutorial("getStepTutorial")
            .addStep({
                targetId: "a",
                message: "first step",
            })
            .addStep({
                targetId: "b",
                message: "second step",
            })
            .addStep({
                targetId: "c",
                message: "third step",
            });
        [
            {
                test: 0,
                expect: true,
            },
            {
                test: 2,
                expect: true,
            },
            {
                test: -1,
                expect: false,
            },
            {
                test: 4,
                expect: false,
            },
        ].forEach((testCase) => {
            it(`returns ${testCase.expect} for ${testCase.test}`, () => {
                expect(tutorial.hasStep(testCase.test)).to.equal(testCase.expect);
            });
        });
    });

    describe("getStep", () => {
        const steps = [
            {
                targetId: "a",
                message: "first step",
            },
            {
                targetId: "b",
                message: "second step",
            },
            {
                targetId: "c",
                message: "third step",
            },
            {
                targetId: "d",
                message: "fourth step",
            },
        ];
        const tutorial = new Tutorial("getStepTutorial");
        steps.forEach((step) => {
            tutorial.addStep(step);
        });

        steps.forEach((expected, idx) => {
            it(`returns step number ${idx}`, () => {
                // Act
                const actual = tutorial.getStep(idx);

                // Assert
                expect(actual).to.equal(expected);
            });
        });
    });

    describe("addStep", () => {
        it("adds to length of tutorial", () => {
            // Arrange
            const tutorial = new Tutorial("title").addStep({ targetId: "x", message: "1" });

            // Assert
            expect(tutorial.length).to.equal(1);
            tutorial.addStep({ targetId: "x", message: "second step!" });
            expect(tutorial.length).to.equal(2);
        });

        it("sets expected step", () => {
            // Arrange
            const secondStep = { targetId: "x", message: "second step!" };
            const tutorial = new Tutorial("title")
                .addStep({ targetId: "x", message: "1" })
                .addStep(secondStep);

            // Assert
            expect(tutorial.getStep(1)).to.equal(secondStep);
        });
    });

    describe("toString", () => {
        [
            {
                test: new Tutorial("Title 1").addStep({ targetId: "x", message: "first step" }),
                expect:
                    '<Tutorial(title: Title 1, steps: [{"targetId":"x","message":"first step"}])>',
            },
            {
                test: new Tutorial("Title 2")
                    .addStep({ targetId: "x", message: "first step" })
                    .addStep({ targetId: "s", message: "second step" }),
                expect:
                    '<Tutorial(title: Title 2, steps: [{"targetId":"x","message":"first step"},{"targetId":"s","message":"second step"}])>',
            },
            {
                test: new Tutorial("Title 3"),
                expect: "<Tutorial(title: Title 3, steps: [])>",
            },
        ].forEach((testCase) => {
            it(`returns ${testCase.expect} for ${testCase.test}`, () => {
                expect(testCase.test.toString()).to.equal(testCase.expect);
            });
        });
    });
});
