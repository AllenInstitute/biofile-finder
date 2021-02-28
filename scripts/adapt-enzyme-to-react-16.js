/* This is intended to be `required` by mocha in order to test React components */
const enzyme = require("enzyme");
const Adapter = require("enzyme-adapter-react-16");

enzyme.configure({ adapter: new Adapter() });
