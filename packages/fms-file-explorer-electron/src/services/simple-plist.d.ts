/**
 * Least-effort typings for https://www.npmjs.com/package/simple-plist.
 *
 *
 */
declare module "simple-plist" {
    interface Properties {
        [index: string]: any;
        CFBundleExecutable: string; // Bizarrely isn't "required" to be set, but is "recommended." It is, however, the only property that matters to us.
    }

    export function readFile(path: string, cb: (err: Error, data: Properties) => void): void;
    export function writeFile(path: string, data: Properties, cb: (err: Error) => void): void;
}
