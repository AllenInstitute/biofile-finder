interface Slide {
    caption: string; // Caption above image
    imgSrc: string; // Image src
}

export interface Feature {
    id: number;
    text: string; // Left menu
    slides: Slide[]; // Right carousel
}
