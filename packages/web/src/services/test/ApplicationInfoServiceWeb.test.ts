import { expect } from "chai";

import ApplicationInfoServiceWeb from "../ApplicationInfoServiceWeb";

describe(`ApplicationInfoServiceWeb`, () => {
    describe("updateAvailable", () => {
        it("returns false", async () => {
            // Arrange
            const service = new ApplicationInfoServiceWeb();

            // Act
            const result = await service.updateAvailable();

            // Assert
            expect(result).to.be.false;
        });
    });

    describe("getUserName", () => {
        it("returns 'Anonymous Web User'", async () => {
            // Arrange
            const service = new ApplicationInfoServiceWeb();

            // Act
            const result = await service.getUserName();

            // Assert
            expect(result).to.equal("Anonymous Web User");
        });
    });

    describe("getApplicationVersion", () => {
        it("returns '999.999.999'", async () => {
            // Arrange
            const service = new ApplicationInfoServiceWeb();

            // Act
            const version = await service.getApplicationVersion();

            // Assert
            expect(version).to.equal("999.999.999");
        });
    });
});
