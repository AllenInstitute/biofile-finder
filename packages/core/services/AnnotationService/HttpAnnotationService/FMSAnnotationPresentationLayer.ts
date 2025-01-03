import { AnnotationResponse } from "../../../entity/Annotation";
import AnnotationName from "../../../entity/Annotation/AnnotationName";

export default function renameAnnotation(annotation: AnnotationResponse): AnnotationResponse {
    if (annotation.annotationName === AnnotationName.LOCAL_FILE_PATH) {
        return {
            ...annotation,
            annotationDisplayName: "File Path (Local VAST)",
        } as AnnotationResponse;
    } else {
        return annotation;
    }
}
