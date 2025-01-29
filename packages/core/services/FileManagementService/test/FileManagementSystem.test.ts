// import * as fs from "fs";
// import * as os from "os";
// import * as path from "path";

// import { expect } from "chai";
// import { createSandbox, SinonStubbedInstance } from "sinon";

// import FileManagementSystem from "..";
// import {
//   FileStorageService,
//   JobStatusService,
//   MetadataManagementService,
// } from "../..";
// import { mockJob, mockWorkingUploadJob } from "../../../state/test/mocks";
// import { FSSUpload, UploadStatus } from "../../file-storage-service";
// import {
//   JSSJob,
//   JSSJobStatus,
//   UploadJob,
// } from "../../job-status-service/types";
// import ChunkedFileReader from "../ChunkedFileReader";

// class TestError extends Error {
//   constructor() {
//     super("Test.");
//     this.name = "TestError";
//   }
// }

// describe("FileManagementSystem", () => {
//   const sandbox = createSandbox();
//   let fileReader: SinonStubbedInstance<ChunkedFileReader>;
//   let fss: SinonStubbedInstance<FileStorageService>;
//   let jss: SinonStubbedInstance<JobStatusService>;
//   let mms: SinonStubbedInstance<MetadataManagementService>;
//   let fms: FileManagementSystem;
//   const testFilePath = path.resolve(os.tmpdir(), "md5-test.txt");
//   const testFileSize = 1024 * 1024 * 2; //2MB

//   before(async () => {
//     // Generate file with testFileSize of "random" bytes
//     await fs.promises.writeFile(
//       testFilePath,
//       Buffer.allocUnsafe(testFileSize)
//     );
//   });

//   beforeEach(() => {
//     fileReader = sandbox.createStubInstance(ChunkedFileReader);
//     fss = sandbox.createStubInstance(FileStorageService);
//     jss = sandbox.createStubInstance(JobStatusService);
//     mms = sandbox.createStubInstance(MetadataManagementService);

//     fms = new FileManagementSystem({
//       fileReader: fileReader as any,
//       fss: fss as any,
//       jss: jss as any,
//       mms: mms as any,
//     });
//   });

//   afterEach(() => {
//     sandbox.restore();
//   });

//   after(async () => {
//     await fs.promises.unlink(testFilePath);
//   });

//   describe("initiateUpload", () => {
//     it("creates tracking job in JSS", async () => {
//       // Act
//       await fms.initiateUpload(
//         { file: { originalPath: "", fileType: "txt" } },
//         "test"
//       );

//       // Assert
//       expect(jss.createJob).to.have.been.calledOnce;
//     });
//   });

//   describe("upload", () => {

//     it("restarts 'WORKING' job in FSS", async () => {
//       // Arrange
//       const uploadId = "elephant091234124";
//       const { mtime: fileLastModified } =
//           await fs.promises.stat(testFilePath);
//       const fileLastModifiedInMs = fileLastModified.getTime();
//       const uploadJob: UploadJob = {
//         ...mockJob,
//         serviceFields: {
//           files: [
//             {
//               file: {
//                 fileType: "text",
//                 originalPath: testFilePath,
//               },
//             },
//           ],
//           type: "upload",
//         },
//       };
//       const workingUploadJob: UploadJob = {
//         ...mockJob,
//         status: JSSJobStatus.WORKING,
//         serviceFields: {
//           fssUploadId: uploadId,
//           lastModifiedInMS: fileLastModifiedInMs,
//           files: [
//             {
//               file: {
//                 fileType: "text",
//                 originalPath: testFilePath,
//               },
//             },
//           ],
//           type: "upload",
//         },
//       };
//       const completeUploadJob: UploadJob = {
//         ...mockJob,
//         status: JSSJobStatus.SUCCEEDED,
//         serviceFields: {
//           fssUploadId: uploadId,
//           lastModifiedInMS: fileLastModifiedInMs,
//           files: [
//             {
//               file: {
//                 fileType: "text",
//                 originalPath: testFilePath,
//               },
//             },
//           ],
//           type: "upload",
//         },
//       };
//       fss.fileExistsByNameAndSize.resolves(false);
//       fss.registerUpload.onFirstCall().resolves({ status: UploadStatus.WORKING, chunkStatuses: [UploadStatus.WORKING], uploadId, chunkSize: 2424, currentFileSize: -1, fileSize: -1})
//           .onSecondCall().resolves({ status: UploadStatus.WORKING, chunkStatuses: [UploadStatus.WORKING,UploadStatus.WORKING], uploadId, chunkSize: 2424, currentFileSize: -1, fileSize: -1 });
//       jss.updateJob.resolves();
//       jss.createJob.resolves(workingUploadJob);
//       jss.getJob
//           .onFirstCall().resolves(uploadJob)
//           .onSecondCall().resolves(workingUploadJob)
//           .onThirdCall().resolves(completeUploadJob);
//       fss.getStatus
//           .onFirstCall().resolves({ status: UploadStatus.WORKING, chunkStatuses: [UploadStatus.WORKING], uploadId: "091234124", chunkSize: 2424, currentFileSize: -1, fileSize: -1 })
//           .onSecondCall().resolves({ status: UploadStatus.COMPLETE, chunkStatuses: [UploadStatus.COMPLETE], uploadId: "091234124", chunkSize: 2424, currentFileSize: -1, fileSize: -1})
//       const fileId = "12343124";
//       const localPath = "/some/path/into/fms/at/test_file.txt";
//       fss.finalize.resolves({
//         errorCount: 0,
//         chunkNumber: 14,
//         uploadId: uploadJob.jobId,
//       });
//       fss.getFileAttributes.resolves({
//         fileId,
//         localPath,
//         name: "",
//         size: 4,
//         md5: "",
//       });

//       // Act
//       await fms.upload(uploadJob);

//       // Assert
//       // not called by upload unless redirected to retry
//       expect(fss.getStatus.called).to.be.true;
//       // Make sure the job get set to state RETRYING
//       expect(jss.updateJob.calledWith(uploadJob.jobId, {
//         status: JSSJobStatus.RETRYING,
//       })).to.be.true;
//     });

//     it("Inits chunked upload instead of local_nas_shortcut", async () => {
//       // Arrange
//       const upload: UploadJob = {
//         ...mockJob,
//         serviceFields: {
//           files: [
//             {
//               file: {
//                 fileType: "text",
//                 originalPath: testFilePath,
//               },
//             },
//           ],
//           type: "upload",
//           localNasShortcut: false
//         },
//       };
//       const uploadId = "091234124";
//       const expectedMd5 = "testMd5";
//       fss.fileExistsByNameAndSize.resolves(false);
//       fss.registerUpload.resolves({ status: UploadStatus.WORKING, uploadId, chunkSize: 2424, chunkStatuses: [], currentFileSize: -1, fileSize: -1 });
//       fileReader.read.resolves(expectedMd5)

//       // Act
//       await fms.upload(upload);

//       // Assert
//       expect(fileReader.read).to.have.been.calledOnce;
//       expect(fss.finalize.calledOnceWithExactly(uploadId, expectedMd5)).to.be.true;
//     });

//     it("Inits local_nas_shortcut instead of chunked.", async () => {
//       // Arrange
//       const upload: UploadJob = {
//         ...mockJob,
//         serviceFields: {
//           files: [
//             {
//               file: {
//                 fileType: "text",
//                 originalPath: testFilePath,
//               },
//             },
//           ],
//           type: "upload",
//           localNasShortcut: true
//         },
//       };
//       const uploadId = "091234124";
//       fss.fileExistsByNameAndSize.resolves(false);
//       fss.registerUpload.resolves({ status: UploadStatus.WORKING, uploadId, chunkSize: 2424, chunkStatuses: [], currentFileSize: -1, fileSize: -1 });
//       fss.getStatus.resolves({
//         status: UploadStatus.COMPLETE,
//         uploadId,
//         chunkSize: 2424,
//         chunkStatuses: [],
//         currentFileSize: 99,
//         fileSize: -1
//       });
//       // Act
//       await fms.upload(upload);

//       // Assert
//       expect(fileReader.read).to.have.not.been.called;
//       expect(fss.finalize).to.have.not.been.called;
//     });

//     it("creates appropriate metadata & completes tracking job", async () => {
//       // Arrange
//       const upload: UploadJob = {
//         ...mockJob,
//         serviceFields: {
//           files: [
//             {
//               file: {
//                 fileType: "text",
//                 originalPath: testFilePath,
//               },
//             },
//           ],
//           type: "upload",
//         },
//       };
//       const uploadId = "091234124";
//       const expectedMd5 = "testMd5";
//       fss.fileExistsByNameAndSize.resolves(false);
//       fss.registerUpload.resolves({ status: UploadStatus.WORKING, uploadId, chunkSize: 2424, chunkStatuses: [], currentFileSize: -1, fileSize: -1 });
//       fileReader.read.resolves(expectedMd5)

//       // Act
//       await fms.upload(upload);

//       // Assert
//       expect(
//         fss.fileExistsByNameAndSize.calledOnceWithExactly(
//           path.basename(testFilePath),
//           testFileSize
//         )
//       ).to.be.true;
//       expect(fileReader.read).to.have.been.calledOnce;
//       expect(fss.finalize.calledOnceWithExactly(uploadId, expectedMd5)).to.be.true;
//     });

//     it("makes requests to FSS asyncronously", async () => {
//       // Arrange
//       const md5 = "09k2341234k";
//       const upload: UploadJob = {
//         ...mockJob,
//         serviceFields: {
//           files: [
//             {
//               file: {
//                 fileType: "text",
//                 originalPath: testFilePath,
//               },
//             },
//           ],
//           type: "upload",
//         },
//       };
//       const uploadId = "091234124";
//       fss.fileExistsByNameAndSize.resolves(false);
//       fss.registerUpload.resolves({ status: UploadStatus.WORKING, uploadId, chunkSize: 2424, chunkStatuses: [], currentFileSize: -1, fileSize: -1 });
//       fileReader.read.callsFake(
//         async (
//           args:{uploadId: string, source: string, onProgress: (chunk: Uint8Array, partialMd5: string) => Promise<void>}):Promise<string>=>{
//         for(let i = 0; i < 5; i++){
//           await args.onProgress(new Uint8Array(), "");
//         }
//         return md5;
//       });
//       let inFlightFssRequests = 0;
//       let wasParallelising = false;
//       fss.sendUploadChunk.callsFake(async ()=>{
//         inFlightFssRequests++;
//         await new Promise((resolve)=>setTimeout(resolve, 25));
//         if(inFlightFssRequests > 1){
//           wasParallelising = true;
//         }
//         inFlightFssRequests--;
//       });
//       // Act
//       await fms.upload(upload);

//       // Assert
//       expect(wasParallelising).to.be.true;
//       expect(inFlightFssRequests).to.be.equal(0);
//     });

//     it("fails upload if error occurs during read", async () => {
//       // Arrange
//       const error = "Test failure during read";
//       const upload: UploadJob = {
//         ...mockJob,
//         serviceFields: {
//           files: [
//             {
//               file: {
//                 fileType: "text",
//                 originalPath: testFilePath,
//               },
//             },
//           ],
//           type: "upload",
//         },
//       };
//       fss.fileExistsByNameAndSize.resolves(false);
//       fss.registerUpload.resolves({ status: UploadStatus.WORKING, uploadId: "091234124", chunkSize: 2424, chunkStatuses: [], currentFileSize: -1, fileSize: -1 });
//       fileReader.read.rejects(new Error(error));

//       // Act
//       await expect(fms.upload(upload)).to.be.rejectedWith(Error);

//       // Assert
//       expect(
//         fss.fileExistsByNameAndSize.calledOnceWithExactly(
//           path.basename(testFilePath),
//           testFileSize
//         )
//       ).to.be.true;
//       expect(
//         jss.updateJob.calledWithExactly(upload.jobId, {
//           status: JSSJobStatus.FAILED,
//           serviceFields: {
//             error: `Something went wrong uploading ${upload.jobName}. Details: ${error}`,
//             cancelled: false,
//           },
//         })
//       ).to.be.true;
//       expect(fileReader.read).to.have.been.calledOnce;
//     });

//     it("fails upload if fss errors bubble up from reader", async () => {
//       // Arrange
//       const upload: UploadJob = {
//         ...mockJob,
//         serviceFields: {
//           files: [
//             {
//               file: {
//                 fileType: "text",
//                 originalPath: testFilePath,
//               },
//             },
//           ],
//           type: "upload",
//         },
//       };
//       const uploadId = "091234124";
//       fss.fileExistsByNameAndSize.resolves(false);
//       fss.registerUpload.resolves({ status: UploadStatus.WORKING, uploadId, chunkSize: 2424, chunkStatuses: [], currentFileSize: -1, fileSize: -1 });
//       // p.getName.callsFake(() => { return "Alex Smith"; });
//       fileReader.read.callsFake(async (args:{uploadId: string, source: string, onProgress: (chunk: Uint8Array, partialMd5: string) => Promise<void>}):Promise<string>=>{
//         await args.onProgress(new Uint8Array(), "testMd5");
//         return "completeMd5";
//       });
//       fss.sendUploadChunk.callsFake(async ()=>{
//         throw new TestError();
//       });
//       // Act, Assert
//       expect(fms.upload(upload)).to.be.rejectedWith(TestError);
//     });
//   });

//   describe("retry", () => {
//     it("creates new upload if fss upload not tracked", async () => {
//       // Arrange
//       const upload: UploadJob = {
//         ...mockJob,
//         serviceFields: {
//           files: [
//             {
//               file: {
//                 fileType: "text",
//                 originalPath: testFilePath,
//               },
//             },
//           ],
//           type: "upload",
//         },
//       };
//       const fileId = "12343124";
//       const localPath = "/some/path/into/fms/at/test_file.txt";
//       jss.getJob.resolves(upload);
//       jss.createJob.resolves(upload);
//       fss.fileExistsByNameAndSize.resolves(false);
//       fss.registerUpload.resolves({ status: UploadStatus.WORKING, uploadId: "091234124", chunkSize: 2424, chunkStatuses: [], currentFileSize: -1, fileSize: -1 });
//       fss.finalize.resolves({
//         errorCount: 0,
//         chunkNumber: 14,
//         uploadId: upload.jobId,
//       });
//       fss.getFileAttributes.resolves({
//         fileId,
//         localPath,
//         name: "",
//         size: 4,
//         md5: "",
//       });

//       // Act
//       await fms.retry("mockUploadId");

//       // Assert
//       expect(jss.createJob).to.have.been.calledOnce;
//     });

//     it("creates new upload if fss upload not in progress (able to resume)", async () => {
//       // Arrange
//       const upload: UploadJob = {
//         ...mockJob,
//         serviceFields: {
//           files: [
//             {
//               file: {
//                 fileType: "text",
//                 originalPath: testFilePath,
//               },
//             },
//           ],
//           fssUploadId: "234124141",
//           type: "upload",
//         },
//       };
//       const fileId = "12343124";
//       const localPath = "/some/path/into/fms/at/test_file.txt";
//       const inactiveUploadId = "mockUploadId";
//       const newUploadId = "091234124";
//       jss.getJob.resolves(upload);
//       jss.createJob.resolves(upload);
//       fss.getStatus.onFirstCall().resolves({
//         uploadId: inactiveUploadId,
//         chunkSize: -1,
//         status: UploadStatus.INACTIVE,
//         chunkStatuses: [],
//         currentFileSize: -1,
//         fileSize: -1
//       });
//       fss.fileExistsByNameAndSize.resolves(false);
//       fss.registerUpload.resolves({ status: UploadStatus.WORKING, uploadId: newUploadId, chunkSize: 2424, chunkStatuses: [], currentFileSize: -1, fileSize: -1 });
//       fss.finalize.resolves({
//         errorCount: 0,
//         chunkNumber: 14,
//         uploadId: upload.jobId,
//       });
//       fss.getFileAttributes.resolves({
//         fileId,
//         localPath,
//         name: "",
//         size: 4,
//         md5: "",
//       });

//       // Act
//       await fms.retry(inactiveUploadId);

//       // Assert
//       expect(jss.createJob).to.have.been.calledOnce;
//     });

//     it("Recreated upload succeeds if fss upload not in progress (able to resume)", async () => {
//       // Arrange
//       const upload: UploadJob = {
//         ...mockJob,
//         serviceFields: {
//           files: [
//             {
//               file: {
//                 fileType: "text",
//                 originalPath: testFilePath,
//               },
//             },
//           ],
//           fssUploadId: "234124141",
//           type: "upload",
//         },
//       };
//       const md5 = "test_md5";
//       const fileId = "12343124";
//       const localPath = "/some/path/into/fms/at/test_file.txt";
//       const inactiveUploadId = "mockUploadId";
//       const newUploadId = "091234124";
//       jss.getJob.resolves(upload);
//       jss.createJob.resolves(upload);
//       fss.getStatus.onFirstCall().resolves({
//         uploadId: inactiveUploadId,
//         chunkSize: -1,
//         status: UploadStatus.INACTIVE,
//         chunkStatuses: [],
//         currentFileSize: -1,
//         fileSize: -1
//       }).onSecondCall().resolves(
//       {
//         uploadId: inactiveUploadId,
//         chunkSize: -1,
//         status: UploadStatus.COMPLETE,
//         chunkStatuses: [],
//         currentFileSize: -1,
//         fileSize: -1
//       });
//       fss.fileExistsByNameAndSize.resolves(false);
//       fss.registerUpload.resolves({ status: UploadStatus.WORKING, uploadId: newUploadId, chunkSize: 2424, chunkStatuses: [], currentFileSize: -1, fileSize: -1 });
//       fss.finalize.resolves({
//         errorCount: 0,
//         chunkNumber: 14,
//         uploadId: upload.jobId,
//       });
//       fss.getFileAttributes.resolves({
//         fileId,
//         localPath,
//         name: "",
//         size: 4,
//         md5: "",
//       });
//       fileReader.read.resolves(md5)

//       // Act
//       await fms.retry(inactiveUploadId);

//       // Assert
//       expect(fss.finalize.calledWith(newUploadId, md5)).to.be.true;
//       expect(jss.createJob).to.have.been.calledOnce;
//     });

//     it("creates multiple new uploads for backwards compatibility", async () => {
//       // Arrange
//       const upload: UploadJob = {
//         ...mockJob,
//         serviceFields: {
//           files: [
//             {
//               file: {
//                 fileType: "text",
//                 originalPath: testFilePath,
//               },
//             },
//             {
//               file: {
//                 fileType: "text",
//                 originalPath: testFilePath,
//               },
//             },
//           ],
//           type: "upload",
//         },
//       };
//       const fileId = "12343124";
//       const localPath = "/some/path/into/fms/at/test_file.txt";
//       jss.getJob.resolves(upload);
//       jss.createJob.resolves(upload);
//       fss.fileExistsByNameAndSize.resolves(false);
//       fss.registerUpload.resolves({ status: UploadStatus.WORKING, uploadId: "091234124", chunkSize: 2424, chunkStatuses: [], currentFileSize: -1, fileSize: -1 });
//       fss.finalize.resolves({
//         errorCount: 0,
//         chunkNumber: 14,
//         uploadId: upload.jobId,
//       });
//       fss.getFileAttributes.resolves({
//         fileId,
//         localPath,
//         name: "",
//         size: 4,
//         md5: "",
//       });

//       // Act
//       await fms.retry("mockUploadId");

//       // Assert
//       expect(fss.finalize.calledTwice).to.be.true;
//       expect(fss.registerUpload.calledTwice).to.be.true;
//       expect(jss.createJob.getCalls()).to.be.lengthOf(2);
//     });

//     it(`resumes sending chunks for an upload with an WORKING FSS status`, async () => {
//       // Arrange
//       const { mtime: fileLastModified } =
//         await fs.promises.stat(testFilePath);
//       const fileLastModifiedInMs = fileLastModified.getTime();
//       const upload: UploadJob = {
//         ...mockJob,
//         serviceFields: {
//           files: [
//             {
//               file: {
//                 fileType: "text",
//                 originalPath: testFilePath,
//               },
//             },
//           ],
//           fssUploadId: "234124141",
//           type: "upload",
//           lastModifiedInMS: fileLastModifiedInMs,
//         },
//       };
//       const fssUpload: JSSJob = {
//         ...mockJob,
//       };
//       fss.getChunkInfo.resolves({ cumulativeMD5: "anyMd5", size: 0, status: UploadStatus.COMPLETE })
//       jss.getJob.onFirstCall().resolves(upload);
//       fss.getStatus.resolves({
//         status: UploadStatus.WORKING,
//         chunkSize: -1,
//         uploadId: "-1",
//         chunkStatuses: [],
//         currentFileSize: -1,
//         fileSize: -1
//       });
//       jss.getJob.onSecondCall().resolves(fssUpload);

//       // Act
//       await fms.retry("mockUploadId");

//       // Assert
//       expect(jss.createJob.called).to.be.false;
//       expect(fileReader.read).to.have.been.calledOnce;
//     });

//     it(`resumes local_nas_shortcut upload with an WORKING FSS status`, async () => {
//       // Arrange
//       const uploadId = "234124141";
//       const { mtime: fileLastModified } =
//         await fs.promises.stat(testFilePath);
//       const fileLastModifiedInMs = fileLastModified.getTime();
//       const upload: UploadJob = {
//         ...mockJob,
//         serviceFields: {
//           files: [
//             {
//               file: {
//                 fileType: "text",
//                 originalPath: testFilePath,
//               },
//             },
//           ],
//           localNasShortcut: true,
//           fssUploadId: uploadId,
//           type: "upload",
//           lastModifiedInMS: fileLastModifiedInMs,
//         },
//       };
//       const fssUpload: JSSJob = {
//         ...mockJob,
//       };
//       jss.getJob.onFirstCall().resolves(upload);
//       jss.getJob.onSecondCall().resolves(fssUpload);
//       fss.registerUpload.resolves({ 
//         status: UploadStatus.WORKING, uploadId, chunkSize: 2424, chunkStatuses: [], currentFileSize: -1, fileSize: -1 
//       });
//       fss.getStatus.onFirstCall().resolves({
//         status: UploadStatus.WORKING,
//         chunkSize: -1,
//         uploadId: "-1",
//         chunkStatuses: [],
//         currentFileSize: -1,
//         fileSize: -1
//       });
//       fss.getStatus.onSecondCall().resolves({
//         status: UploadStatus.COMPLETE,
//         chunkSize: -1,
//         uploadId: "-1",
//         chunkStatuses: [],
//         currentFileSize: -1,
//         fileSize: -1
//       });

//       // Act
//       await fms.retry(uploadId);

//       // Assert
//       // expect(fss.cancelUpload.called).to.be.false;
//       expect(jss.createJob.called).to.be.false;
//       expect(jss.updateJob.calledWith(upload.jobId, {
//         status: JSSJobStatus.RETRYING,
//       })).to.be.true;
//       expect(fss.registerUpload.called).to.be.true;
//       expect(fileReader.read.called).to.be.false;
//     });

//     it("calls retryFinalize on a chunked upload", async () => {
//       // Arrange
//       const { mtime: fileLastModified } =
//         await fs.promises.stat(testFilePath);
//       const fileLastModifiedInMs = fileLastModified.getTime();
//       const fssUploadId = "234124141";
//       const fuaUploadJob: UploadJob = {
//         ...mockJob,
//         serviceFields: {
//           files: [
//             {
//               file: {
//                 fileType: "text",
//                 originalPath: testFilePath,
//               },
//             },
//           ],
//           localNasShortcut: false,
//           fssUploadId,
//           type: "upload",
//           lastModifiedInMS: fileLastModifiedInMs,
//         },
//       };
//       jss.getJob.onFirstCall().resolves(fuaUploadJob);
//       fss.getStatus.resolves({
//         uploadId: fssUploadId,
//         chunkSize: 5,
//         status: UploadStatus.RETRY,
//         chunkStatuses: [UploadStatus.COMPLETE],
//         currentFileSize: 5,
//         fileSize: -1
//       });
//       fss.getChunkInfo.resolves({
//         cumulativeMD5: "155,15,172,125,232,3,0,0,0,0,0,0,251,202,102,144,7,248,49,200,135,184,123,11,17,82,191,19,96,32,156,6,0,0,0,0,1,0,128,19,0,0,0,0,100,0,0,0,153,6,0,102,144,31,156,6,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0",
//         size: 5,
//         status: UploadStatus.COMPLETE,
//       });

//       // Act
//       await fms.retry(fssUploadId);

//       // Assert
//       expect(fss.retryFinalizeMd5.calledWith(fssUploadId, "770134b98f3fc804f593ea0098af8490")).to.be.true;
//     });

//     it("calls retryFinalize on a localNasShortcut upload", async () => {
//       // Arrange
//       const { mtime: fileLastModified } =
//         await fs.promises.stat(testFilePath);
//       const fileLastModifiedInMs = fileLastModified.getTime();
//       const fssUploadId = "234124141";
//       const fuaUploadJob: UploadJob = {
//         ...mockJob,
//         serviceFields: {
//           files: [
//             {
//               file: {
//                 fileType: "text",
//                 originalPath: testFilePath,
//               },
//             },
//           ],
//           localNasShortcut: true,
//           fssUploadId,
//           type: "upload",
//           lastModifiedInMS: fileLastModifiedInMs,
//         },
//       };
//       jss.getJob.onFirstCall().resolves(fuaUploadJob);
//       fss.getStatus.onFirstCall().resolves({
//         uploadId: fssUploadId,
//         chunkSize: -1,
//         status: UploadStatus.RETRY,
//         chunkStatuses: [],
//         currentFileSize: -1,
//         fileSize: -1
//       }).onSecondCall().resolves({
//         uploadId: fssUploadId,
//         chunkSize: -1,
//         status: UploadStatus.COMPLETE,
//         chunkStatuses: [],
//         currentFileSize: -1,
//         fileSize: -1
//       });

//       // Act
//       await fms.retry(fssUploadId);

//       // Assert
//       expect(jss.createJob.called).to.be.false;
//       expect(fss.retryFinalizeForLocalNasShortcutUpload.calledWith(fssUploadId)).to.be.true;
//     });

//     it("resumes an upload that just needs finalizing", async () => {
//       // Arrange
//       const { mtime: fileLastModified } =
//       await fs.promises.stat(testFilePath);
//       const fileLastModifiedInMs = fileLastModified.getTime();
//       const fuaUploadJob: UploadJob = {
//         ...mockJob,
//         serviceFields: {
//           files: [
//             {
//               file: {
//                 fileType: "text",
//                 originalPath: testFilePath,
//               },
//             },
//           ],
//           fssUploadId: "234124141",
//           type: "upload",
//           lastModifiedInMS: fileLastModifiedInMs,
//         },
//       };
//       const fssUploadJob: FSSUpload = {
//         ...mockJob,
//         serviceFields: {
//           fileId: "testFileId"
//         },
//       };
//       const fileId = "12343124";
//       const localPath = "/some/path/into/fms/at/test_file.txt";
//       jss.getJob.onFirstCall().resolves(fuaUploadJob).onSecondCall().resolves(fssUploadJob);
//       fss.getStatus.resolves({
//         uploadId: "-1",
//         chunkSize: -1,
//         status: UploadStatus.WORKING,
//         chunkStatuses: [],
//         currentFileSize: -1,
//         fileSize: -1
//       });
//       fss.finalize.resolves({
//         errorCount: 0,
//         chunkNumber: 14,
//         uploadId: fuaUploadJob.jobId,
//       });
//       fss.getFileAttributes.resolves({
//         fileId,
//         localPath,
//         name: "",
//         size: 4,
//         md5: "",
//       });

//       // Act
//       await fms.retry("mockUploadId");

//       // Assert
//       expect(jss.createJob.called).to.be.false;
//       // TODO SWE-865 update so that read is skipped if all chunks are uploaded 
//       // expect(fileReader.read.called).to.be.false;
//       expect(fss.finalize.called).to.be.true;
//     });
//   });

//   describe("complete", () => {
//     it("fails upload job on error", async () => {
//       // Arrange
//       mms.createFileMetadata.rejects(new Error("Test failure"));

//       // Act
//       await expect(
//         fms.complete(mockWorkingUploadJob, "90124124")
//       ).to.be.rejectedWith(Error);

//       // Assert
//       expect(jss.updateJob).to.have.been.calledOnce;
//     });
//   });

//   describe("cancel", () => {
//     const mockUploadId = "90k123123";

//     it("cancels upload via reader and FSS", async () => {
//       // Arrange
//       jss.getJob.resolves({
//         ...mockJob,
//         status: JSSJobStatus.WORKING,
//         serviceFields: {
//           ...mockJob.serviceFields,
//           fssUploadId: "12412m4413",
//         },
//       });
//       fss.getStatus.resolves({
//         uploadId: "-1",
//         chunkSize: -1,
//         status: UploadStatus.WORKING,
//         chunkStatuses: [],
//         currentFileSize: -1,
//         fileSize: -1
//       });

//       // Act
//       await fms.cancel(mockUploadId);

//       // Assert
//       expect(fileReader.cancel).to.have.been.calledOnce;
//       expect(fss.cancelUpload).to.have.been.calledOnce;
//     });

//     it("sets job status to FAILED with cancellation flag", async () => {
//       // Arrange
//       jss.getJob.resolves(mockJob);

//       // Act
//       await fms.cancel(mockUploadId);

//       // Assert
//       expect(
//         jss.updateJob.calledOnceWithExactly(mockUploadId, {
//           status: JSSJobStatus.FAILED,
//           serviceFields: {
//             cancelled: true,
//             error: "Cancelled by user",
//           },
//         })
//       ).to.be.true;
//     });

//     it("rejects cancellations of uploads that have been successfully copied into the FMS", async () => {
//       // Arrange
//       jss.getJob.resolves({
//         ...mockJob,
//         status: JSSJobStatus.WORKING,
//         serviceFields: {
//           ...mockJob.serviceFields,
//           fssUploadId: "12412m4413",
//         },
//       });
//       fss.getStatus.resolves({
//         uploadId: "-1",
//         chunkSize: -1,
//         status: UploadStatus.COMPLETE,
//         chunkStatuses: [],
//         currentFileSize: -1,
//         fileSize: -1
//       });

//       // Act / Assert
//       await expect(fms.cancel(mockUploadId)).rejectedWith(Error);
//     });

//     it("rejects cancellation if upload not in progress", async () => {
//       // Arrange
//       jss.getJob.resolves({
//         ...mockJob,
//         status: JSSJobStatus.SUCCEEDED,
//       });

//       // Act / Arrange
//       await expect(fms.cancel(mockUploadId)).rejectedWith(Error);
//     });
//   });

//   describe("Path normalization, convert to posix.", () => {
//     it("converts Windows path to posix.",async () => {
//       expect(fms.posixPath("//Allen/aics/foo/test.czi")).to.equal("/allen/aics/foo/test.czi");
//       expect(fms.posixPath("/Allen/aics/foo/test.czi")).to.equal("/allen/aics/foo/test.czi");
//       expect(fms.posixPath("/ALLEN/aics/foo/test.czi")).to.equal("/allen/aics/foo/test.czi");
//       expect(fms.posixPath("/allen/aics/foo/test.czi")).to.equal("/allen/aics/foo/test.czi");
//     });

//     it("Evaluates true when asked if Isilon path should be a localNasShortcut upload.", async () => {
//       expect(fms.shouldBeLocalNasUpload("//allen/aics/assay-dev/MicroscopyData/Sara/2023/20230420/ZSD2notes.txt")).to.be.true;
//     });

//   });
// });
