import { forOwn, isFunction } from "lodash";

type AnyFunction = () => any;

// `Object` is correct here, so:
// eslint-disable-next-line @typescript-eslint/ban-types
export function bindAll(obj: Object, methods: AnyFunction[]) {
    const setOfMethods = new Set(methods);
    forOwn(obj.constructor.prototype, (value: any, key: string) => {
        if (setOfMethods.has(value) && isFunction(value)) {
            Object.assign(obj, { [key]: value.bind(obj) });
        }
    });
}
