export enum GroupSlug {
    About = "about",
    RealWorldUseCases = "real-world-use-cases",
    AppInformation = "app-information",
    GettingStarted = "getting-started",
    OtherResources = "other-resources",
}

// Moving a page between groups will break any
// links to that page including in the user guide itself
// make sure to look for any references to the enum value
// before doing so
export enum PageSlug {
    // Group.About
    Overview = "overview",
    FeatureHighlights = "feature-highlights",

    // Group.AppInformation
    Specifications = "specifications",
    SupportedViewers = "supported-viewers",

    // Group.GettingStarted
    SetupOverview = "setup-overview",
    CreatingADatasetMetadataFile = "creating-a-metadata-file",
    MetadataGuidance = "metadata-guidance",
    DescribingColumns = "columns-descriptions",
    FileAndMetadataProvenance = "provenance",

    // Group.OtherResources
    StorageOptions = "storage-options",
    AvoidingCORSErrors = "cors",

    // Group.RealWorldUseCases
    UseCasesAndScenarios = "use-cases",
    ExampleAICS = "example-aics",
    ExampleAIBS = "example-aibs",
    ExampleAMBIOM = "example-ambiom",
}

// Specific section headings used for both displaying the
// actual heading and for linking to the section via anchor links
// These are not given explicit slugs and instead have them generated
// from the heading itself since sections within pages are less important
// to link to and are more likely to change over time.
export enum SectionHeading {
    SpreadsheetExamples = "Spreadsheet (dataset) examples",
    ViewerTable = "Image viewer comparison table",
    ExploreScreeningResults = "Explore Screening Results",
    ValidateMetadata = "Validate Metadata",
    InspectSubsetsOfImages = "Inspect Subsets of Images",
    PerformQCOnDatasets = "Perform QC on Datasets",
    ManageImageInventory = "Manage Image Inventory",
}

interface Section {
    // Use SectionHeading enum values for headings that are used in multiple places
    // to avoid breaking links when the heading text changes.
    heading?: string;
    /**
     * Heading level rendered for this section (h2, h3, or h4).
     * Defaults to h2 if omitted. Use h3/h4 for subsections within a page.
     */
    level?: 2 | 3 | 4;
    body: React.ReactNode;
}

export interface NavigationGroup {
    slug: GroupSlug;
    title: string;
    pages: Page[];
}

export interface Page {
    slug: PageSlug;
    title: string;
    intro?: string;
    sections: Section[];
}
