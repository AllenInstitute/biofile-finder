import axios from "axios";

import HttpServiceBase from "../HttpServiceBase";

export default class FileStorageServiceBase extends HttpServiceBase {
    public isS3Url(url: string): boolean {
        try {
            const { protocol, hostname } = new URL(url);
            return protocol === "https:" && hostname.endsWith(".amazonaws.com");
        } catch (error) {
            return false;
        }
    }

    public parseS3Url(url: string): { bucket: string; key: string; region: string } {
        const { hostname, pathname } = new URL(url);
        const [bucket] = hostname.split(".");
        const key = pathname.slice(1);
        const region = hostname.split(".")[2];
        return { bucket, key, region };
    }

    public async listS3Objects(bucket: string, prefix: string, region: string): Promise<string[]> {
        const url = `https://${bucket}.s3.${region}.amazonaws.com?list-type=2&prefix=${encodeURIComponent(
            prefix
        )}`;
        const response = await axios.get(url);
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(response.data, "text/xml");

        const keys: string[] = [];
        const contents = xmlDoc.getElementsByTagName("Key");

        for (let i = 0; i < contents.length; i++) {
            keys.push(contents[i].textContent || "");
        }

        return keys;
    }
}
