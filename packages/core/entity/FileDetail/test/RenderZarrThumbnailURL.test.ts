import { expect } from "chai";
import { describe, it } from "mocha";
import type * as omezarr from "ome-zarr.js";
import sinon from "sinon";

import { OmeroChannel, renderZarrThumbnailURL } from "../RenderZarrThumbnailURL";
import type { ThumbnailConfig } from "../RenderZarrThumbnailURL";

class MockNgffImage {
    private zSize: number | undefined;
    private tSize: number | undefined;
    private cSize: number | undefined;
    private omeroChannels: OmeroChannel[] | undefined;

    public renderCallCount = 0;
    public renderOptions: Parameters<omezarr.NgffImage["render"]>[0] | undefined;

    constructor(params: {
        zSize?: number;
        tSize?: number;
        cSize?: number;
        omeroChannels?: OmeroChannel[];
    }) {
        this.zSize = params.zSize;
        this.tSize = params.tSize;
        this.cSize = params.cSize;
        this.omeroChannels = params.omeroChannels;
    }

    get imgAttrs() {
        return {
            omero: {
                channels: this.omeroChannels,
            },
        };
    }

    async getShape(): Promise<number[]> {
        const shape = [];
        if (this.zSize !== undefined) shape.push(this.zSize);
        if (this.tSize !== undefined) shape.push(this.tSize);
        if (this.cSize !== undefined) shape.push(this.cSize);
        shape.push(20);
        shape.push(30);
        return Promise.resolve(shape);
    }

    getAxesNames(): string[] {
        const axes = [];
        if (this.zSize !== undefined) axes.push("z");
        if (this.tSize !== undefined) axes.push("t");
        if (this.cSize !== undefined) axes.push("c");
        axes.push("x");
        axes.push("y");
        return axes;
    }

    async render(...options: Parameters<omezarr.NgffImage["render"]>): Promise<string> {
        this.renderCallCount++;
        this.renderOptions = options[0];
        return Promise.resolve("mock-url");
    }
}

// Due to fix for error in `RenderZarrThumbnailURL`, the type is `any` on
// the loader.
function createMockLoader(image: MockNgffImage): () => Promise<any> {
    return () => Promise.resolve(image);
}

describe("renderZarrThumbnailURL", () => {
    const ZARR_URL = "https://some-url.com/my-data.ome.zarr";
    const DEFAULT_SIZE = 300;
    const DEFAULT_THUMBNAIL_CONFIG = {
        relativeT: 0.5,
        relativeZ: 0.5,
        overrideOmeroMetadata: false,
        channelConfigs: [
            { enabled: true, hexColor: "ff0000" },
            { enabled: false, hexColor: "00ff00" },
            { enabled: true, hexColor: "0000ff" },
        ],
    } satisfies ThumbnailConfig;
    const DEFAULT_THUMBNAIL_CONFIG_CHANNELS: OmeroChannel[] = [
        { color: "ff0000", active: true },
        { color: "00ff00", active: false },
        { color: "0000ff", active: true },
    ];
    const DEFAULT_OMERO_CHANNELS: OmeroChannel[] = [
        { color: "ffff00", active: false },
        { color: "ff00ff", active: true },
        { color: "00ffff", active: false },
    ];

    // Mock timeout
    let clock: sinon.SinonFakeTimers;
    beforeEach(() => {
        clock = sinon.useFakeTimers();
    });
    afterEach(() => {
        clock.restore();
    });

    it("does not apply thumbnail config when undefined", async () => {
        const mockImage = new MockNgffImage({});
        const ngffImageLoader = createMockLoader(mockImage);
        await renderZarrThumbnailURL(ZARR_URL, DEFAULT_SIZE, { ngffImageLoader });

        expect(mockImage.renderCallCount).to.equal(1);
        expect(mockImage.renderOptions).to.deep.equal({
            targetSize: DEFAULT_SIZE,
            autoBoost: true,
            channels: undefined,
            slices: undefined,
        });
    });

    it("maps T and Z slices", async () => {
        const mockImage = new MockNgffImage({ tSize: 100, zSize: 100, cSize: 3 });
        const thumbnailConfig = DEFAULT_THUMBNAIL_CONFIG;
        const ngffImageLoader = createMockLoader(mockImage);
        await renderZarrThumbnailURL(ZARR_URL, DEFAULT_SIZE, { thumbnailConfig, ngffImageLoader });

        expect(mockImage.renderCallCount).to.equal(1);
        expect(mockImage.renderOptions?.slices?.t).to.deep.equal(49);
        expect(mockImage.renderOptions?.slices?.z).to.deep.equal(49);
    });

    it("handles 0 bound for T and Z slices", async () => {
        const mockImage = new MockNgffImage({ tSize: 100, zSize: 100, cSize: 3 });
        const thumbnailConfig = { ...DEFAULT_THUMBNAIL_CONFIG, relativeT: 0, relativeZ: 0 };
        const ngffImageLoader = createMockLoader(mockImage);
        await renderZarrThumbnailURL(ZARR_URL, DEFAULT_SIZE, { thumbnailConfig, ngffImageLoader });

        expect(mockImage.renderCallCount).to.equal(1);
        expect(mockImage.renderOptions?.slices?.t).to.deep.equal(0);
        expect(mockImage.renderOptions?.slices?.z).to.deep.equal(0);
    });

    it("handles upper bound (1) for T and Z slices", async () => {
        const mockImage = new MockNgffImage({ tSize: 100, zSize: 100, cSize: 3 });
        const thumbnailConfig = { ...DEFAULT_THUMBNAIL_CONFIG, relativeT: 1, relativeZ: 1 };
        const ngffImageLoader = createMockLoader(mockImage);
        await renderZarrThumbnailURL(ZARR_URL, DEFAULT_SIZE, { thumbnailConfig, ngffImageLoader });

        expect(mockImage.renderCallCount).to.equal(1);
        expect(mockImage.renderOptions?.slices?.t).to.deep.equal(99);
        expect(mockImage.renderOptions?.slices?.z).to.deep.equal(99);
    });

    it("does not set slice values when T and Z dimension is undefined", async () => {
        const mockImage = new MockNgffImage({ cSize: 3 });
        const thumbnailConfig = { ...DEFAULT_THUMBNAIL_CONFIG, relativeT: 1, relativeZ: 1 };
        const ngffImageLoader = createMockLoader(mockImage);
        await renderZarrThumbnailURL(ZARR_URL, DEFAULT_SIZE, { thumbnailConfig, ngffImageLoader });

        expect(mockImage.renderCallCount).to.equal(1);
        expect(mockImage.renderOptions?.slices).to.be.undefined;
    });

    it("does not set channel state when omero metadata is present", async () => {
        const mockImage = new MockNgffImage({
            tSize: 100,
            zSize: 100,
            cSize: 3,
            omeroChannels: DEFAULT_OMERO_CHANNELS,
        });
        const thumbnailConfig = DEFAULT_THUMBNAIL_CONFIG;
        const ngffImageLoader = createMockLoader(mockImage);
        await renderZarrThumbnailURL(ZARR_URL, DEFAULT_SIZE, { thumbnailConfig, ngffImageLoader });

        expect(mockImage.renderCallCount).to.equal(1);
        expect(mockImage.renderOptions?.channels).to.be.undefined;
    });

    it("sets channel parameters when omero metadata is not present", async () => {
        const mockImage = new MockNgffImage({ tSize: 100, zSize: 100, cSize: 3 });
        const thumbnailConfig = DEFAULT_THUMBNAIL_CONFIG;
        const ngffImageLoader = createMockLoader(mockImage);
        await renderZarrThumbnailURL(ZARR_URL, DEFAULT_SIZE, { thumbnailConfig, ngffImageLoader });

        expect(mockImage.renderCallCount).to.equal(1);
        expect(mockImage.renderOptions?.channels).to.deep.equal(DEFAULT_THUMBNAIL_CONFIG_CHANNELS);
    });

    it("overrides omero metadata when flag is set", async () => {
        const mockImage = new MockNgffImage({
            tSize: 100,
            zSize: 100,
            cSize: 3,
            omeroChannels: DEFAULT_OMERO_CHANNELS,
        });
        const thumbnailConfig = { ...DEFAULT_THUMBNAIL_CONFIG, overrideOmeroMetadata: true };
        const ngffImageLoader = createMockLoader(mockImage);
        await renderZarrThumbnailURL(ZARR_URL, DEFAULT_SIZE, { thumbnailConfig, ngffImageLoader });

        expect(mockImage.renderCallCount).to.equal(1);
        expect(mockImage.renderOptions?.channels).to.deep.equal(DEFAULT_THUMBNAIL_CONFIG_CHANNELS);
    });

    it("only configures channels present", async () => {
        const mockImage = new MockNgffImage({ tSize: 100, zSize: 100, cSize: 2 });
        const thumbnailConfig = { ...DEFAULT_THUMBNAIL_CONFIG };
        const ngffImageLoader = createMockLoader(mockImage);
        await renderZarrThumbnailURL(ZARR_URL, DEFAULT_SIZE, { thumbnailConfig, ngffImageLoader });

        expect(mockImage.renderCallCount).to.equal(1);
        // Skips 3rd channel
        expect(mockImage.renderOptions?.channels).to.deep.equal([
            DEFAULT_THUMBNAIL_CONFIG_CHANNELS[0],
            DEFAULT_THUMBNAIL_CONFIG_CHANNELS[1],
        ]);
    });
});
