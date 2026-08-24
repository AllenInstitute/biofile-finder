import axios from "axios";
import yaml from "js-yaml";

import { getNameFromSourceUrl, Source } from "../SearchParams";
import DataSourcePreparationError from "../../errors/DataSourcePreparationError";

export interface DatasetSources {
    dataSource?: Source; // actual dataset
    descriptionsSource?: Source; // source for metadata/column descriptions
    provenanceSource?: Source; // source for provenance schema file
}

interface RawDatasetMetadata {
    title?: string;
    date?: string; // YYYY-MM-DD
    authors?: string[];
    dataset_url?: string; // actual dataset
    descriptions_url?: string; // url to metadata descriptions
    provenance_url?: string; // url to provenance schema file
    [key: string]: string | string[] | Source | undefined; // other unknown user-provided headers
}

export interface ParsedDatasetMetadata extends DatasetSources, RawDatasetMetadata {}

export interface ParsedFrontmatter {
    metadata?: ParsedDatasetMetadata;
    body: string; // raw markdown
    error?: Error;
}

// Look for the markdown/yml file to start with a pattern like
// ---
// title: something
// date: etc
// ---
// body
const FRONT_MATTER_REGEX = /^---\s*\r?\n([\s\S]*?)\r?\n---\s*\r?\n([\s\S]*)$/;

/**
 * Extract yaml key/value pairs from text.
 * When `parseSources` is false, skip the step that extracts names and types from data sources
 * (e.g., if we just want to preview the raw data and urls)
 */
export function parseFrontMatter(contents: string, parseSources = true): ParsedFrontmatter {
    const match = contents.match(FRONT_MATTER_REGEX);
    if (!match) {
        return {
            body: contents,
        };
    }
    const [, yamlText, body] = match;
    try {
        const metadata = yaml.load(yamlText) as RawDatasetMetadata;
        const parsedMetadata = deriveSourcesFromMetadata(metadata);
        return {
            metadata: parseSources ? parsedMetadata : metadata,
            body,
        };
    } catch (e) {
        const error = new Error(`Unable to parse yaml: ${(e as Error).message}`);
        console.error(error);
        return { body: contents, error: error };
    }
}

// Generate source names only when the markdown file is first processed
// since getNameFromSourceUrl uses a new Date every time it's called
function deriveSourcesFromMetadata(metadata: RawDatasetMetadata): ParsedDatasetMetadata {
    let dataSource;
    let provenanceSource;
    let descriptionsSource;
    const datasetUrl = metadata.dataset_url;
    const provenanceUrl = metadata.provenance_url;
    const descriptionsUrl = metadata.descriptions_url;
    if (datasetUrl) {
        dataSource = {
            name: getNameFromSourceUrl(datasetUrl),
            uri: datasetUrl,
        };
    }
    if (provenanceUrl) {
        provenanceSource = {
            name: getNameFromSourceUrl(provenanceUrl),
            uri: provenanceUrl,
        };
    }
    if (descriptionsUrl) {
        descriptionsSource = {
            name: getNameFromSourceUrl(descriptionsUrl),
            uri: descriptionsUrl,
        };
    }
    return {
        // also still contains the original urls
        ...metadata,
        dataSource,
        provenanceSource,
        descriptionsSource,
    };
}

// Fetch or read in the markdown file. Accepts a File object or url, but not a local path (e.g., "/local/path/on/users/machine")
export async function processMarkdown(
    source: Source,
    normalizeSources = true
): Promise<ParsedFrontmatter> {
    const { uri } = source;
    if (uri === undefined)
        throw new DataSourcePreparationError(
            `Unable to find URL or file for "${source.name}".`,
            source.name
        );
    let plainText = "";
    if (uri instanceof File) {
        plainText = await uri.text();
    } else {
        // try to treat the uri as a url
        const response = await axios.get(uri).catch((e) => {
            throw new DataSourcePreparationError(
                `Unable to process markdown file with URL ${uri}. Received error: ${
                    (e as Error)?.message || e
                }`,
                source.name
            );
        });
        // In case axios doesn't throw
        if (response.data === undefined) {
            throw new DataSourcePreparationError(
                `Failed to fetch markdown file with URL ${uri}. Response status text: ${response.statusText}`,
                source.name
            );
        }
        plainText = String(response.data);
    }
    return parseFrontMatter(plainText, normalizeSources);
}
