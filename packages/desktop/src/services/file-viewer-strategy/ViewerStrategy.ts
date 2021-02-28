/**
 * Interface for concrete viewer strategies to implement. A viewer strategy defines
 * an interchangeable function for opening a file viewer given a path to
 * the file viewer's executable and a list of file paths to open.
 */
type ViewerStrategy = (executable: string, filePaths: string[]) => Promise<void>;

export default ViewerStrategy;
