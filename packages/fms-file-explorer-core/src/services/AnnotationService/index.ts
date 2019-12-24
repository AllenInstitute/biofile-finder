import RestServiceResponse from "../../entity/RestServiceResponse";

/**
 * Service responsible for fetching annotation related metadata.
 */
export default class AnnotationService {
    private static BASE_ANNOTATION_URL = "api/1.0/annotations";

    public fetchSizeOfValues(annotation_name: string): Promise<number> {
        const requestUrl = `${AnnotationService.BASE_ANNOTATION_URL}/${annotation_name}/size`;
        console.log(`Requesting size of annotation values collection from ${requestUrl}`);

        // TEMPORARY, FLAT-FILE BASED IMPLEMENTATION UNTIL QUERY SERVICE EXISTS
        return new Promise((resolve) => {
            setTimeout(() => {
                const res = new RestServiceResponse<number>(
                    require(`../../../assets/annotation-values/${annotation_name}_size`)
                );
                resolve(res.data[0]);
            }, 750);
        });
    }

    public fetchValues(annotation_name: string): Promise<(string | number | boolean)[]> {
        const requestUrl = `${AnnotationService.BASE_ANNOTATION_URL}/${annotation_name}`;
        console.log(`Requesting annotation values from ${requestUrl}`);

        // TEMPORARY, FLAT-FILE BASED IMPLEMENTATION UNTIL QUERY SERVICE EXISTS
        return new Promise((resolve) => {
            setTimeout(() => {
                const res = new RestServiceResponse<string | number | boolean>(
                    require(`../../../assets/annotation-values/${annotation_name}`)
                );
                resolve(res.data);
            }, 750);
        });
    }
}
