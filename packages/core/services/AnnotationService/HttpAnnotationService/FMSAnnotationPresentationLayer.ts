import { AnnotationResponse } from "../../../entity/Annotation";
import AnnotationName from "../../../entity/Annotation/AnnotationName";

export default function renameAnnotation(annotation: AnnotationResponse): AnnotationResponse {
    if (annotation.annotationName === AnnotationName.CACHE_EVICTION_DATE) {
        return {
            ...annotation,
            annotationDisplayName: "VAST Expiration Date",
        } as AnnotationResponse;
    } else {
        return annotation;
    }
}
