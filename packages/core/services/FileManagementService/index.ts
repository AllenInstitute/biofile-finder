import HttpServiceBase from "../HttpServiceBase";

interface FileRecord {

}

interface UploadStatusResponse {
  // TODO: Work on this
  fileId: string;
}

/**
 * Service entity for storing or retrieving files from the AICS FMS. This
 * class is responsible for abstracting the work needed to upload a file into
 * the FMS.
 */
export default class FileManagementService extends HttpServiceBase {
  private static readonly BASE_FILE_PATH = "";
  private static readonly BASE_UPLOAD_PATH = "";

  /**
   * Converts Windows style FMS path to Unix style.
   */
  private static normalizePath(filePath: string){
    throw new Error("normalizePath - Not implemented");
    // Windows is inconsistent here (have seen both 'ALLEN' and Allen' generated in the wild)
    // const mntPointForcedLowerCase = filePath.replace(/allen/gi, 'allen');
    // // convert path separators from Windows to Unix style.
    // const convertedPosix = mntPointForcedLowerCase.split(path.sep).join(path.posix.sep);
    // // Remove double slash, from windows format
    // const replaced = convertedPosix.replace('//', '/');                                  
    // return replaced;
  }

  /**
   * TODO
   */
  private static isFileMultiFile(filePath: string): boolean {
    return filePath.endsWith(".zarr") || filePath.endsWith(".sld") || filePath.endsWith(".sldy");
  }

  /**
   * Uploads the file at the given path and metadata.
   * Sends upload in chunks reporting the total bytes
   * read on each chunk submission.
   * Does not complete the upload, FSS must do some work asynchronously
   * before we can do so. This app will track the FSS upload job to
   * determine when it is time to complete the upload.
   */
  public async upload(
    filePath: string,
    shouldBeInLocal: boolean,
  ): Promise<string> {
    // TODO: Problem here where we should be doing the complete next or at the end of this whole jazz
    // TODO: would be nice to have the metadata happen outside of just waiting around here
    // TODO: Probably want to trigger all of these and then let FSS figure out how to process them all while
    // TODO: Polling FES for the files to come through yk? then we can attach the metadata
    const url = `${FileManagementService.BASE_UPLOAD_PATH}/register`;
    const postBody = {
      // TODO: IGNORING THESE IN HOPES WE CAN JUST DROP THEM FROM REQUIRED LIST
      // file_name: getFileNameFromPath(filePath),
      // file_type: getFileTypeFromPath(filePath),
      // file_size: fileSize,
      multifile: FileManagementService.isFileMultiFile(filePath),
      local_nas_shortcut: true,
      local_nas_path: FileManagementService.normalizePath(filePath),
      should_be_in_local: shouldBeInLocal,
    };
    const { data } = await this.post<UploadStatusResponse>(
      url,
      JSON.stringify(postBody),
    );
    const { fileId } = data[0];
    return fileId;
  }

  public async getUploadProgress(userName: string): Promise<number> {
    // TODO: check for upload progress
    // TODO: Need to use JSS because going to start tons at once
    return 3;
  }

  /**
   * Attempts to cancel the ongoing upload. Unable to cancel uploads
   * in progress or that have been copied into FMS.
   */
  public async cancel(uploadId: string): Promise<void> {
    try {
        const url = `${FileManagementService.BASE_UPLOAD_PATH}/${uploadId}`;
        await this.delete<UploadStatusResponse>(url);
        return;
    } catch (error) {
      // TODO: Ignore certain errors... like if it is already complete
      throw error;
    }
  }
}
