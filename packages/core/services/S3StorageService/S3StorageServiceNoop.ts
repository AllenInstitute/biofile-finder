import S3StorageService from ".";

export default class S3StorageServiceNoop extends S3StorageService {
    public formatAsHttpResource() {
        return Promise.resolve(undefined);
    }

    public getObjectsInDirectory() {
        return Promise.resolve([]);
    }

    public getCloudDirectoryInfo() {
        return Promise.resolve(undefined);
    }

    public getCloudObjectSize() {
        return Promise.resolve(0);
    }
}
