type ViewerStrategy = (executable: string, filePaths: string[]) => Promise<void>;

export default ViewerStrategy;
