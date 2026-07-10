import { Icon } from "@fluentui/react";
import { kebabCase } from "lodash";
import * as React from "react";

import { Page, PageSlug, SectionHeading } from "./types";

export const REAL_WORLD_USE_CASES_CONTENT: Page[] = [
    {
        slug: PageSlug.UseCasesAndScenarios,
        title: "Use cases & scenarios",
        intro:
            "BioFile Finder (BFF) is flexible enough to fit many different workflows and contexts. This page highlights common use cases observed across research labs, core facilities, and data teams — along with real-world scenarios showing how different types of users leverage BFF in their work.",
        sections: [
            {
                heading: "How people use BFF",
                body: (
                    <>
                        <p>
                            This table is a summary of known use cases. Read detailed descriptions
                            below.
                        </p>
                        <table className="ug-table">
                            <thead>
                                <tr>
                                    <th>Use case</th>
                                    <th>Key BFF actions</th>
                                    <th>Time saved vs. manual</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <td>
                                        <a
                                            href={`#${kebabCase(
                                                SectionHeading.ExploreScreeningResults
                                            )}`}
                                        >
                                            <strong>
                                                {SectionHeading.ExploreScreeningResults}
                                            </strong>
                                        </a>
                                    </td>
                                    <td>
                                        Group by plate/treatment; filter by phenotype; share URL
                                    </td>
                                    <td>Hours of scripting per query</td>
                                </tr>
                                {/* "Validate metadata" row — temporarily hidden
                                <tr>
                                    <td>
                                        <a href={`#${kebabCase(SectionHeading.ValidateMetadata)}`}>
                                            <strong>{SectionHeading.ValidateMetadata}</strong>
                                        </a>
                                    </td>
                                    <td>
                                        Filter for blanks/duplicates; group to check counts; export
                                        errors
                                    </td>
                                    <td>Days of spreadsheet auditing</td>
                                </tr>
                                */}
                                <tr>
                                    <td>
                                        <a
                                            href={`#${kebabCase(
                                                SectionHeading.InspectSubsetsOfImages
                                            )}`}
                                        >
                                            <strong>{SectionHeading.InspectSubsetsOfImages}</strong>
                                        </a>
                                    </td>
                                    <td>
                                        Multi-filter to exact subset; open in viewer; arrow-key
                                        navigation
                                    </td>
                                    <td>Hunting through folders by hand</td>
                                </tr>
                                <tr>
                                    <td>
                                        <a
                                            href={`#${kebabCase(
                                                SectionHeading.PerformQCOnDatasets
                                            )}`}
                                        >
                                            <strong>{SectionHeading.PerformQCOnDatasets}</strong>
                                        </a>
                                    </td>
                                    <td>
                                        Aggregate counts per group; filter for anomalies;
                                        cross-validate columns
                                    </td>
                                    <td>Custom scripts per dataset</td>
                                </tr>
                                <tr>
                                    <td>
                                        <a
                                            href={`#${kebabCase(
                                                SectionHeading.ManageImageInventory
                                            )}`}
                                        >
                                            <strong>{SectionHeading.ManageImageInventory}</strong>
                                        </a>
                                    </td>
                                    <td>
                                        Host metadata file; browse by any column; shareable filtered
                                        URLs
                                    </td>
                                    <td>Building and maintaining a web portal</td>
                                </tr>
                                <tr>
                                    <td>
                                        <strong>Compare across experimental dimensions</strong>
                                    </td>
                                    <td>
                                        Pivot/group across multiple metadata axes (e.g., cell line ×
                                        staining × condition); rapidly switch views
                                    </td>
                                    <td>Rewriting analysis scripts per comparison</td>
                                </tr>
                                <tr>
                                    <td>
                                        <strong>Collaborative data exploration</strong>
                                    </td>
                                    <td>
                                        Share filtered views; maintain consistent dataset state
                                        across users; parallel exploration
                                    </td>
                                    <td>Back-and-forth file exchange and re-alignment</td>
                                </tr>
                                <tr>
                                    <td>
                                        <strong>Publish interactive datasets</strong>
                                    </td>
                                    <td>
                                        Share public BFF links tied to figures; enable readers to
                                        explore full datasets in-browser
                                    </td>
                                    <td>Building custom portals or static supplements</td>
                                </tr>
                            </tbody>
                        </table>
                    </>
                ),
            },
            {
                heading: SectionHeading.ExploreScreeningResults,
                level: 3,
                body: (
                    <>
                        <p>
                            A high-content screening run produces tens of thousands of images across
                            hundreds of wells, multiple plates, and several time points. The
                            pipeline outputs a Parquet or CSV manifest linking each image file to
                            its well position, compound treatment, concentration, cell line, and
                            measured phenotype scores.
                        </p>
                        <h4>How BFF helps</h4>
                        <p>
                            Load the manifest into BFF and immediately group files by Plate &gt;
                            Treatment &gt; Concentration to see how many images exist at each
                            condition. Filter to a specific compound and sort by phenotype score to
                            surface the most interesting wells. Click into a well to see thumbnails
                            of every image at that position. Share the filtered view with a
                            colleague by copying the URL — they see exactly the same subset without
                            re-running any queries.
                        </p>
                        <h4>Alternative use case</h4>
                        <p>
                            A genomics core runs CRISPR screens and outputs per-guide results as a
                            CSV. Researchers load it into BFF to filter by gene target, sort by
                            effect size, and quickly identify which guides to follow up on — without
                            writing R or Python code.
                        </p>
                    </>
                ),
            },
            /* "Validate metadata" section — temporarily hidden
            {
                heading: SectionHeading.ValidateMetadata,
                level: 3,
                body: (
                    <>
                        <p>
                            Before publishing a dataset or submitting to a repository, you need to
                            confirm that every file has complete, consistent metadata — no missing
                            cell lines, no mislabeled plates, no blank file paths.
                        </p>
                        <h4>How BFF helps</h4>
                        <p>
                            Load your metadata file and use BFF&apos;s filters to find gaps. Group
                            by &quot;Cell Line&quot; and look for a blank or &quot;(No value)&quot;
                            group — those are your missing entries. Sort by &quot;File Path&quot; to
                            spot duplicates or malformed paths. Filter for rows where
                            &quot;Treatment&quot; is empty to find unlabeled conditions. Use the
                            aggregate count at each folder level to verify expected file counts per
                            condition (e.g., &quot;I should have 96 images per plate — any plate
                            with fewer has missing data&quot;). Export the problematic subset as a
                            CSV for correction.
                        </p>
                        <h4>Alternative use case</h4>
                        <p>
                            A museum digitization team loads their specimen catalog CSV into BFF to
                            check for records missing accession numbers, blank taxonomic
                            classifications, or broken file paths to scans — catching errors before
                            ingesting into their collection management system.
                        </p>
                    </>
                ),
            },
            */
            {
                heading: SectionHeading.InspectSubsetsOfImages,
                level: 3,
                body: (
                    <>
                        <p>
                            You don&apos;t want to look at all 50,000 images. You want to look at a
                            very specific slice — maybe failed QC images, or images from a
                            particular experimental condition, or everything captured on a specific
                            date.
                        </p>
                        <h4>How BFF helps</h4>
                        <p>
                            Apply filters to narrow down to exactly the subset you care about:
                            &quot;Cell Line = iPSC&quot; AND &quot;Plate = 007&quot; AND &quot;QC
                            Status = Failed&quot;. The file list updates instantly to show only
                            matching files. Click any file to see its full metadata in the detail
                            panel. Open the image directly in your preferred viewer (FIJI, AGAVE,
                            Neuroglancer, or the browser) to visually inspect it. Navigate through
                            the filtered list with arrow keys to quickly scan through the subset
                            one-by-one.
                        </p>
                        <h4>Alternative use case</h4>
                        <p>
                            A pathology lab filters their slide inventory to all H&amp;E-stained
                            tissue sections from a specific patient cohort and date range, then
                            opens each in their whole-slide viewer to confirm stain quality before
                            analysis.
                        </p>
                    </>
                ),
            },
            {
                heading: SectionHeading.PerformQCOnDatasets,
                level: 3,
                body: (
                    <>
                        <p>
                            Quality control means checking that your data is complete and correct
                            before you build on it — the right number of files, sensible values,
                            nothing blank, corrupted, or mislabeled. If you&apos;ve tried to do this
                            by scrolling through a huge spreadsheet, you know it gets unmanageable
                            fast — and you shouldn&apos;t have to write code or formulas to catch
                            these problems.
                        </p>
                        <h4>How BFF helps</h4>
                        <p>
                            Drop your metadata file into BFF and let it do the checking for you — no
                            scripts, no coding. The aggregate info bar shows your total file count
                            at a glance. Group by &quot;Plate,&quot; then &quot;Well,&quot; to see
                            how many images are in each — any group with fewer than expected jumps
                            right out. Filter for files where &quot;File Size&quot; is 0 to find
                            empty or broken files. Sort by &quot;Date Acquired&quot; to make sure
                            nothing&apos;s out of sequence. Group by &quot;Instrument&quot; to
                            confirm everything came from the microscope you expected. You can even
                            stack filters to catch labeling mistakes — for example, show only
                            &quot;Control&quot; plates that aren&apos;t labeled &quot;DMSO&quot; —
                            all by pointing and clicking instead of programming.
                        </p>
                        <h4>Alternative use case</h4>
                        <p>
                            A lab manager preparing a dataset for publication receives images and a
                            metadata spreadsheet from a student. Rather than asking a programmer to
                            write a validation script, they open it in BFF to look for duplicate
                            sample names, spot rows missing a file path or a label, and confirm
                            every expected experiment is present — finding and fixing the mistakes
                            themselves before the data goes out.
                        </p>
                    </>
                ),
            },
            {
                heading: SectionHeading.ManageImageInventory,
                level: 3,
                body: (
                    <>
                        <p>
                            You or your team have accumulated a large collection of files over
                            months or years. They live across local drives, shared network storage,
                            or cloud buckets. You have metadata about them — maybe a database
                            export, maybe a painstakingly maintained spreadsheet — and you need an
                            easy way to browse, search, and share access to this inventory without
                            maintaining a server.
                        </p>
                        <h4>How BFF helps</h4>
                        <p>
                            Export your inventory as a Parquet file (or maintain it as a CSV) with
                            columns for file path, file name, and any annotations that matter to
                            your team (project, investigator, organism, imaging modality, date,
                            etc.). Host the file on a web server, S3 bucket, or just keep it local.
                            Point BFF at it. Your entire team can now browse the inventory by any
                            column, search for specific files, and open them directly. Add a source
                            metadata file to provide human-readable descriptions for each column.
                            When someone asks &quot;do we have any confocal images of iPSC-derived
                            cardiomyocytes from 2024?&quot;, the answer is three clicks away instead
                            of a Slack thread.
                        </p>
                        <h4>Alternative use case</h4>
                        <p>
                            A natural history museum has 200,000 digitized specimen records in a CSV
                            exported from their collection database. They host a BFF instance on
                            their website so visiting researchers can browse specimens by taxonomy,
                            collection site, and date — filtering to exactly the subset relevant to
                            their study and downloading a manifest of matching file paths.
                        </p>
                    </>
                ),
            },
            {
                heading: "Real-world scenarios",
                body: (
                    <>
                        <h3>Imaging scientists</h3>
                        <p>
                            <i>
                                I have thousands of images and I just want to find the right ones.
                            </i>
                        </p>
                        <p>
                            You ran a plate screen last week and now need to find every image from
                            Well A3 treated with Drug X. Your files are scattered across folders,
                            drives, or cloud storage, with no easy way to search by experimental
                            conditions. BFF lets you load a spreadsheet of your file metadata and
                            instantly filter, sort, and group by any column—cell line, treatment,
                            plate, date, or anything else you need. No coding, no databases, no IT
                            tickets. Just drag, drop, and find your files.
                        </p>
                        <h3>Computational biologists</h3>
                        <p>
                            <i>
                                I want to query millions of files without writing a pipeline to do
                                it.
                            </i>
                        </p>
                        <p>
                            You have a Parquet manifest with 10 million rows of imaging metadata.
                            You need to pull a specific subset for your next analysis run. BFF runs
                            full SQL queries in your browser via DuckDB—no server, no cluster, no
                            credentials. Filter by any combination of annotations, copy out the file
                            paths you need, and get back to your actual work. Share your exact query
                            with a collaborator by copying the URL.
                        </p>
                        <h3>Data engineers &amp; platform teams</h3>
                        <p>
                            <i>
                                I want to give users self-service data access without building a
                                portal.
                            </i>
                        </p>
                        <p>
                            Your team maintains the imaging pipeline. Scientists keep asking you to
                            &quot;just pull all the files where...&quot; and it turns into a JIRA
                            ticket every time. BFF is a zero-infrastructure frontend: point it at a
                            Parquet file on S3 or a CSV on a web server and your users can explore,
                            filter, and export on their own. No backend to deploy, no API to
                            maintain, no accounts to manage. Host a static web page and you&apos;re
                            done.
                        </p>
                        <h3>Academic facility managers &amp; PIs</h3>
                        <p>
                            <i>I need to make my shared data actually usable.</i>
                        </p>
                        <p>
                            You run a core imaging facility or oversee a lab generating terabytes of
                            data. Your shared drive has 50,000 files and a naming convention that
                            made sense two years ago. BFF turns any metadata spreadsheet into a
                            searchable, filterable, shareable interface. Publish a dataset with a
                            BFF link and reviewers, collaborators, or new lab members can explore it
                            immediately—no software to install, no accounts to create.
                        </p>
                        <h3>GLAM &amp; museum professionals</h3>
                        <p>
                            <i>I want to make my collection metadata interactive.</i>
                        </p>
                        <p>
                            You have a CSV with 200,000 digitized specimens, each with accession
                            numbers, taxonomic classifications, collection dates, and file paths to
                            high-resolution scans. BFF turns that spreadsheet into a browsable,
                            filterable, groupable interface—right in the browser. Let researchers
                            explore your collection by species, date range, or geographic origin.
                            Share a filtered view as a URL. No web developer needed.
                        </p>
                    </>
                ),
            },
        ],
    },

    {
        slug: PageSlug.ExampleAICS,
        title: "The cell science accelerator at Allen Institute",
        intro:
            "BioFile Finder (BFF) was used in publication by the cell science accelerator at Allen Institute.",
        sections: [
            {
                heading: "",
                body: (
                    <>
                        <p>
                            <a
                                href="https://www.biorxiv.org/content/10.1101/2024.08.16.608353v1"
                                target="_blank"
                                rel="noreferrer"
                            >
                                Open publication{" "}
                                <Icon iconName="OpenInNewWindow" className="ug-icon-sm" />
                            </a>
                            <br />
                            <a
                                href="https://bff.allencell.org/app?c=Gene%3A0.25%2CCell+Line%3A0.25%2CFile+Name%3A0.25%2CDrug+Concentration%3A0.25&group=Experimental+Condition&group=Gene&openFolder=%5B%222D+PLF+colony+BMP4+EMT%22%5D&openFolder=%5B%222D+PLF+colony+BMP4+EMT%22%2C%22CDH1%22%5D&source=%7B%22name%22%3A%22imaging_and_segmentation_data.csv+%2815%2F08%2F2025+13%3A09%3A25%29%22%2C%22type%22%3A%22csv%22%2C%22uri%22%3A%22https%3A%2F%2Fallencell.s3.amazonaws.com%2Faics%2Femt_timelapse_dataset%2Fmanifests%2Fimaging_and_segmentation_data.csv%22%7D&sourceMetadata=%7B%22name%22%3A%22Imaging_and_segmentation_data_column_description.csv+%2815%2F08%2F2025+13%3A09%3A32%29%22%2C%22type%22%3A%22csv%22%2C%22uri%22%3A%22https%3A%2F%2Fallencell.s3.amazonaws.com%2Faics%2Femt_timelapse_dataset%2Fmanifests%2FImaging_and_segmentation_data_column_description.csv%22%7D"
                                target="_blank"
                                rel="noreferrer"
                            >
                                View dataset in BFF{" "}
                                <Icon iconName="OpenInNewWindow" className="ug-icon-sm" />
                            </a>
                        </p>
                        <p>
                            In this study on epithelial-to-mesenchymal transition (EMT), the authors
                            generated a large-scale microscopy dataset consisting of 3,538 3D
                            Z-stack datasets across 37 experimental conditions, 8 cell lines, and 9
                            antibody stainings. BioFile Finder (BFF) was used to organize and
                            explore this complex dataset without relying on a fixed folder
                            hierarchy. Instead, BFF enabled dynamic filtering, grouping, and
                            navigation based on metadata, allowing users to analyze the data across
                            multiple dimensions (e.g., comparing stainings across cell lines)
                            without duplicating files. This approach improved collaboration between
                            experimental and computational researchers, supported parallel analysis
                            workflows, and reduced friction in large-scale data exploration.
                            Additionally, BFF was used to share the dataset publicly, enabling
                            readers to directly access figure-associated data, explore full 3D
                            timelapse datasets in the browser, and interact with the dataset using
                            the same flexible metadata-driven framework.
                        </p>
                        <h4>Key takeaways</h4>
                        <blockquote>
                            <p>
                                &ldquo;Every organizational choice comes at the cost of another. In
                                other words, every choice is a bad choice.&rdquo; &mdash; Antoine
                                Borensztejn, <i>author</i>
                            </p>
                            <p>
                                &ldquo;BioFile Finder (BFF) allowed us to break away from this
                                constraint entirely.&rdquo; &mdash; Antoine Borensztejn,{" "}
                                <i>author</i>
                            </p>
                            <p>
                                &ldquo;We believe this approach sets a new standard for FAIR data
                                sharing, and will significantly improve the accessibility,
                                transparency, and reuse of complex biological datasets.&rdquo;
                                &mdash; Antoine Borensztejn, <i>author</i>
                            </p>
                        </blockquote>
                    </>
                ),
            },
        ],
    },

    {
        slug: PageSlug.ExampleAIBS,
        title: "The brain science accelerator at Allen Institute",
        intro:
            "BioFile Finder (BFF) was used in publication by the brain science accelerator at Allen Institute.",
        sections: [
            {
                heading: "",
                body: (
                    <>
                        <p>
                            <a
                                href="https://www.sciencedirect.com/science/article/pii/S0092867425005136"
                                target="_blank"
                                rel="noreferrer"
                            >
                                Open publication{" "}
                                <Icon iconName="OpenInNewWindow" className="ug-icon-sm" />
                            </a>
                            <br />{" "}
                            <a
                                href="https://bff.allencell.org/app?c=Plasmid+ID%3A0.11466848319709355%2CPlasmid+name%3A0.1809718437783833%2CTarget+Cell+Population%3A0.25%2CLABELED+REGION+COARSE%3A0.25%2CLABELED+REGION+FINE%3A0.25%2CLABELED+CELL+POPULATION%3A0.25&group=Enhancer+ID&group=Cargo&group=Delivery+Method&group=Experiment+Type&source=%7B%22name%22%3A%22Enhancer_AAVs%28in%29.csv+%284%2F27%2F2026+1%3A42%3A00+PM%29%22%2C%22type%22%3A%22csv%22%2C%22uri%22%3A%22https%3A%2F%2Fallen-genetic-tools.s3.us-west-2.amazonaws.com%2Fbio_file_finder%2FBFF_collections_csvs%2FEnhancer_AAVs%28in%29.csv%22%7D&sourceMetadata=%7B%22name%22%3A%22BFF_Viral_Description%28in%29.csv+%283%2F16%2F2025+2%3A16%3A05+PM%29%22%2C%22type%22%3A%22csv%22%2C%22uri%22%3A%22s3%3A%2F%2Fallen-genetic-tools%2Fbio_file_finder%2FBFF_collections_csvs%2FBFF_Viral_Description%28in%29.csv%22%7D"
                                target="_blank"
                                rel="noreferrer"
                            >
                                View dataset in BFF{" "}
                                <Icon iconName="OpenInNewWindow" className="ug-icon-sm" />
                            </a>
                        </p>
                        <p>
                            Yoav Ben-Simon from the Allen Institute for Brain Science describes
                            using BioFile Finder (BFF) as a flexible data management and sharing
                            platform for imaging datasets related to viral vector targeting in the
                            brain. BFF was used to organize datasets in a spreadsheet-like
                            interface, enabling intuitive querying, filtering, and restructuring of
                            data without requiring custom software development. The tool allowed
                            users to quickly create and curate datasets, organize them
                            hierarchically based on relevant features, and visualize grouped image
                            sets with thumbnails. This significantly lowered the barrier to entry
                            for data management and sharing, enabling non-engineers to deploy and
                            share datasets via simple links rather than building dedicated web
                            interfaces. Additionally, BFF facilitated collaboration by allowing
                            teams to interact with shared datasets dynamically and supported reuse
                            across different domains, extending from cell imaging to brain section
                            and genomic data visualization.
                        </p>
                        <h4>Key takeaways</h4>
                        <blockquote>
                            <p>
                                &ldquo;BioFile Finder is a data management tool&hellip; like a fancy
                                spreadsheet so that you can interact with it in multiple different
                                ways.&rdquo; &mdash; Yoav Ben-Simon, <i>author</i>
                            </p>
                            <p>
                                &ldquo;I can create and curate data sets in two or three clicks of a
                                button.&rdquo;
                            </p>
                            <p>
                                &ldquo;It doesn&apos;t require exchanging of files&mdash;it just
                                requires exchanging of links.&rdquo; &mdash; Yoav Ben-Simon,{" "}
                                <i>author</i>
                            </p>
                            <p>
                                &ldquo;It was really easy for us to repurpose it&hellip; from
                                looking at individual cells to looking at images of brain sections
                                and genomic data.&rdquo; &mdash; Yoav Ben-Simon, <i>author</i>
                            </p>
                        </blockquote>
                    </>
                ),
            },
            {
                heading: "Video",
                body: (
                    <>
                        <p>
                            Check out this short video from the Allen Institute on how they and
                            AMBIOM at ISAS used BFF to organize and share their datasets.
                        </p>
                        <iframe
                            width="560"
                            height="315"
                            src="https://www.youtube.com/embed/RD2x4BFhWzY?si=a1ZPYrq-k2VVhCCc"
                            title="YouTube video player"
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                            referrerPolicy="strict-origin-when-cross-origin"
                            allowFullScreen
                        ></iframe>
                    </>
                ),
            },
        ],
    },

    {
        slug: PageSlug.ExampleAMBIOM,
        title: "AMBIOM at ISAS",
        sections: [
            {
                heading: "",
                body: (
                    <>
                        <p>
                            AMBIOM develops AI methods for very large microscopy datasets. Copying
                            petabyte-scale image collections into another repository is often
                            impractical. BioFile Finder (BFF) instead indexes metadata while leaving
                            pixel data where it already resides—on institutional servers, cloud
                            object storage, or local storage. Researchers continue using their
                            existing storage infrastructure and permissions while gaining a unified
                            interface for discovery and curation.
                        </p>
                    </>
                ),
            },
            {
                heading: "BFF - an extensible ecosystem",
                body: (
                    <>
                        <p>
                            AMBIOM developed an &quot;Uploader&quot; tool that is compatible with
                            BFF. The BFF Uploader demonstrates the extensibility of the BFF
                            ecosystem. Rather than modifying BFF&apos;s core approach of operating
                            on metadata catalogs, ISAS built an external ingestion layer that
                            automates metadata generation and standardization. This extension
                            enables researchers to move from raw microscopy files to searchable BFF
                            datasets with minimal manual effort while preserving BFF&apos;s
                            decentralized architecture, where image data remains in its original
                            storage locations and only metadata is indexed for discovery and reuse.
                        </p>
                        <p>
                            <a
                                href="https://www.isas.de/en/en-kompakt/isas-bff-uploader/"
                                target="_blank"
                                rel="noreferrer"
                            >
                                Watch a video about the ISAS BFF Uploader{" "}
                                <Icon iconName="OpenInNewWindow" className="ug-icon-sm" />
                            </a>
                        </p>
                    </>
                ),
            },
            {
                heading: "Video",
                body: (
                    <>
                        <p>
                            Check out this short video from the Allen Institute on how they and
                            AMBIOM at ISAS used BFF to organize and share their datasets.
                        </p>
                        <iframe
                            width="560"
                            height="315"
                            src="https://www.youtube.com/embed/RD2x4BFhWzY?si=a1ZPYrq-k2VVhCCc"
                            title="YouTube video player"
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                            referrerPolicy="strict-origin-when-cross-origin"
                            allowFullScreen
                        ></iframe>
                    </>
                ),
            },
        ],
    },
];
