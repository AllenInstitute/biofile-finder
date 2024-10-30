import FilterColumn from "./FilterColumn.png";
import FilterValue from "./FilterValue.png";
import Group from "./Group.png";
import Sort from "./Sort.png";
import { Feature } from "../Feature";

export default {
    id: 1,
    text: "Find target files quickly",
    slides: [
        {
            imgSrc: Group,
            caption: `Unlike traditional file systems, BioFile Finder allows you to dynamically generate your folder structure based on the metadata of your files. In this screenshot, the files are organized (grouped) by the "Structure" and "Plate Barcode" columns found in the selected data source.`,
        },
        {
            imgSrc: FilterColumn,
            caption: "To filter, first select a column name...",
        },
        {
            imgSrc: FilterValue,
            caption: `...then select the desired values.`,
        },
        {
            imgSrc: Sort,
            caption: `Sort by clicking on the column header or the "Sort" button.`,
        },
    ],
} as Feature;
