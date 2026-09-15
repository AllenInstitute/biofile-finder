import { expect } from "chai";

import { createReduxStore, initialState } from "..";
import { Environment, OverridableService } from "../../constants";
import { PersistedConfigKeys } from "../../services/PersistentConfigService";

describe("createReduxStore", () => {
    it("defaults to no environment overrides", () => {
        expect(initialState.interaction.environmentOverrides).to.deep.equal({});
    });

    it("hydrates environment overrides from persisted config", () => {
        // Arrange
        const overrides = {
            [OverridableService.JobStatusService]: Environment.STAGING,
        };

        // Act
        const store = createReduxStore({
            persistedConfig: { [PersistedConfigKeys.EnvironmentOverrides]: overrides },
        });

        // Assert
        expect(store.getState().interaction.environmentOverrides).to.deep.equal(overrides);
    });
});
