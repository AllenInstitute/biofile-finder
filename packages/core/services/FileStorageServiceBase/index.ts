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

    public parseS3Url(url: string): { hostname: string; key: string } {
        const { hostname, pathname } = new URL(url);
        const key = pathname.slice(1);
        return { hostname, key };
    }

    public async listS3Objects(hostname: string, prefix: string): Promise<string[]> {
        const url = `${hostname}?list-type=2&prefix=${encodeURIComponent(prefix)}`;
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
