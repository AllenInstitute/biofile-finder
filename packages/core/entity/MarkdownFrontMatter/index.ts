import axios from "axios";
import yaml from "js-yaml";

import { Source } from "../SearchParams";

export interface DatasetUrls {
    dataset_url?: string; // actual dataset
    descriptions_url?: string; // url to metadata descriptions
    provenance_url?: string; // url to provenance schema file
}

export interface DatasetMetadata extends DatasetUrls {
    title?: string;
    date?: string; // YYYY-MM-DD
    author?: string[];
    [key: string]: string | string[] | undefined; // other unknown user-provided headers
}

export interface ParsedFrontmatter {
    metadata?: DatasetMetadata;
    body: string; // raw markdown
}

// Look for the markdown/yml file to start with a pattern like
// ---
// title: something
// date: etc
// ---
// body
const FRONT_MATTER_REGEX = /^---\s*\r?\n([\s\S]*?)\r?\n---\s*\r?\n([\s\S]*)$/;

export function parseFrontMatter(contents: string): ParsedFrontmatter {
    const match = contents.match(FRONT_MATTER_REGEX);
    if (!match) {
        return {
            body: contents,
        };
    }
    const [, yamlText, body] = match;
    try {
        const metadata = yaml.load(yamlText) as DatasetMetadata;
        return {
            metadata, // to do: determine if some normalization needs to happen here
            body,
        };
    } catch (e) {
        console.error(new Error(`Unable to parse yaml, reason: ${(e as Error).message}`));
        return { body: contents };
    }
}

export async function processMarkdown(source: Source): Promise<ParsedFrontmatter> {
    const { uri } = source;
    let plainText = "";
    if (uri instanceof File) {
        plainText = await uri.text();
    } else if (
        uri?.startsWith("http://") ||
        uri?.startsWith("https://") ||
        uri?.startsWith("s3://")
    ) {
        const response = await axios.get(uri, { responseType: "text" });
        plainText = String(response.data);
    } else {
        throw new Error(`Unable to process markdown file, received unsupported path ${uri}`);
    }
    return parseFrontMatter(plainText);
}
