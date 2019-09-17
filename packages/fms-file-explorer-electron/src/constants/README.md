# Constants

Constants are enums, maps, or otherwise shared variables (`const`s) of concern to the whole application.
Enums and enum-like object maps use PascalCase and are named in the singular. `const` variables use UPPER_SNAKE_CASE.

### Example

```
export enum Color {
    Blue = "rgb(0,0,255)"
    Yellow = "rgb(255,255,0)"
}

export const BASE_API_URL = "/api/v1";
```
