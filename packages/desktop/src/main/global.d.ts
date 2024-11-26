/*eslint no-var: "off"*/
// necessary in order to do: global.environment = "..."
import { Environment } from "./util/constants";

declare global {
    var environment: Environment;
}
