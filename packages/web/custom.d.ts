// react-svg-loader converts SVG files to React components (default export).
declare module "*.svg" {
    import React = require("react");
    const SvgComponent: React.FC<React.SVGProps<SVGSVGElement>>;
    export default SvgComponent;
}

declare module "*.png" {
    const src: string;
    export default src;
}

declare module "*.jpg" {
    const src: string;
    export default src;
}

declare module "*.css" {
    const classes: { [key: string]: string };
    export default classes;
}
