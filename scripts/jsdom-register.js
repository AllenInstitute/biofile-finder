const { JSDOM } = require("jsdom");

const html = `
    <!doctype html>
    <html>
        <head>
            <meta charset="utf-8">
        </head>
    </html>
`;

const dom = new JSDOM(html, {
    pretendToBeVisual: true, // set pretendToBeVisual to enable requestAnimationFrame and cancelAnimationFrame
    url: "http://localhost", // https://github.com/jsdom/jsdom/issues/2383
});

// set the jsdom instance on global so that we can access its methods if need be in tests
global.jsdom = dom;

// setup browser-like globals
global.window = dom.window;
global.document = dom.window.document;

// Enumerable properties on dom.window
for (key in dom.window) {
    if (dom.window.hasOwnProperty(key) && typeof global[key] === "undefined") {
        global[key] = dom.window[key];
    }
}

// Non-enumerable properties. Add to this list as needed. You'll know something is needed when
// you write a new test and you get an error that looks like "ReferenceError: X is not defined."
const NON_ENUMERABLE_KEYS = ["HTMLElement", "Element", "Event"];
for (key of NON_ENUMERABLE_KEYS) {
    if (dom.window.hasOwnProperty(key) && typeof global[key] === "undefined") {
        global[key] = dom.window[key];
    }
}

global.navigator = {
    userAgent: "node.js"
};
