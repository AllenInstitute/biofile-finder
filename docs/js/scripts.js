const OS = {
    WINDOWS: "Windows",
    MAC: "Mac",
    LINUX: "Linux",
    UNKNOWN: "Unknown",
};
const FILE_TYPE_FOR_OS = {
    [OS.WINDOWS]: "exe",
    [OS.MAC]: "dmg",
    [OS.LINUX]: "AppImage",
};
const INSTRUCTIONS_FOR_OS = {
    [OS.WINDOWS]: [
        "Click the 'Download' button to the left.",
        '<strong>If on Windows 11:</strong> Your browser may block the download. If so, click the "..." button next to the .exe file in the downloads tab of your browser to show more options, then select "Keep." If you see a second warning, select "Keep anyway."',
        "Move the downloaded executable from your Downloads folder to a more durable location. Note that ITO prevents executables from being stored <i>directly</i> on either your Desktop or in your Documents folder. The executable can, however, be placed within a folder in either location (e.g., <code>Desktop\\BioFile Finder\\explorer.exe</code>).",
        '<strong>Recommendation:</strong> store the executable in someplace like <code>C:\\Users\\someuser\\BioFile Finder\\</code>. Once there, you can right-click on the .exe and select "Send to" -> "Desktop (create shortcut)"  to make it more convenient to find.',
        '<strong>If on Windows 10 or later:</strong> the <i>first</i> time you run the application, you may see a blue pop-up warning that "Windows protected your PC." To continue, click "More Info," then press the "Run anyway" button.',
    ],
    [OS.MAC]: [
        "Click the 'Download' button to the left.",
        `
        <figure class="figure installation-instr">
            <img class="screenshot" src="resources/macos-open-with-diskimagemounter.png">
            <figcaption class="figure-caption">
            When prompted by your web browser, select 'Open with DiskImageMounter (default).'
            </figcaption>
        </figure>
        `,
        `
        <figure class="figure installation-instr">
            <img class="screenshot" src="resources/macos-drag-into-applications.png">
            <figcaption class="figure-caption">
            Drag and drop the BioFile Finder icon onto the Applications folder icon. If prompted to 'Keep Both,' 'Stop,' or 'Replace,' choose 'Replace.'
            </figcaption>
        </figure>
        `,
        "Open Finder, and locate the BioFile Finder in Applications.",
        "Right-click on the BioFile Finder, select 'Open.' <em>You may need to do this twice in order to get to the next step</em>.",
        `
        <figure class="figure installation-instr">
            <img class="screenshot" src="resources/macos-open-anyway.png">
            <figcaption class="figure-caption">
            You should be prompted with an alert that reads, "macOS cannot verify the developer of 'BioFile Finder'. Are you sure you want to open it?" Select "Open."
            </figcaption>
        </figure>
        `,
        `
        <figure class="figure installation-instr">
            <img class="screenshot" src="resources/macos-connect-to-fms-storage.png">
            <figcaption class="figure-caption">
            (Optional) If you'd like to access any of the files found in the BioFile Finder in a third-party application
            (e.g., opening an image in an image viewer), you'll need to mount FMS storage on your computer.
            To do this: <code>Go</code> → <code>Connect to server</code> → enter <code>smb://allen/programs</code> → <code>Connect</code>.
            <strong>Note! This is only possible when connected to the Allen Institute network; you will be unable to do this
            over VPN.</strong>
            </figcaption>
        </figure>
        `,
    ],
    [OS.LINUX]: [
        "Click the 'Download' button to the left",
        "Locate the download in file browser",
        "Right-click the download",
        'Select the "Properties" dropdown option',
        'Click the "Permissions" tab',
        'Ensure "Allow executing file as program" is checked',
        "Click to open as you would any other application",
    ],
};
const REPO_OWNER = "AllenInstitute";
const REPO = "biofile-finder";

function updateDownloadLink(releaseIdAsString) {
    const releaseId = parseInt(releaseIdAsString, 10);
    const releases = JSON.parse(localStorage.getItem("releases"));
    const release = releases.filter((r) => r["id"] === releaseId)[0];
    const operatingSystem = document.getElementById("os-selector").value;
    // Disable the download button if we have an unknown OS
    if (operatingSystem === OS.UNKNOWN) {
        const downloadButton = document.getElementById("download-button");
        downloadButton.disabled = true;
    } else {
        const assetForOs = release["assets"].filter((a) =>
            a["name"].endsWith(FILE_TYPE_FOR_OS[operatingSystem])
        )[0];
        const downloadLink = document.getElementById("download-link");
        downloadLink.href = assetForOs["browser_download_url"];
        downloadLink.download = assetForOs["name"];
    }
}

function selectOperatingSystem(os) {
    document.getElementById("download-button").innerHTML = `Download for ${os}`;
    document.getElementById(
        "installation-instructions"
    ).innerHTML = `Installation instructions for ${os}`;
    const instructionsElement = document.getElementById("instructions");
    instructionsElement.innerHTML = "";
    INSTRUCTIONS_FOR_OS[os].forEach((instruction) => {
        const paragraph = document.createElement("li");
        paragraph.innerHTML = instruction;
        instructionsElement.appendChild(paragraph);
    });
    const versionSelector = document.getElementById("version-selector");
    versionSelector.value && updateDownloadLink(versionSelector.value);
}

// Fetch the list of releases for the BioFile Finder & initialize related features
function fetchReleases() {
    fetch(`https://api.github.com/repos/${REPO_OWNER}/${REPO}/releases`)
        .then((response) => {
            if (!response.ok) {
                throw Error(response.statusText);
            }
            return response.json();
        })
        .then((data) => {
            const releases = data
                .filter((release) => !release.prerelease)
                .sort((a, b) => b["created_at"].localeCompare(a["created_at"]));
            const versionSelector = document.getElementById("version-selector");
            releases.forEach((release, index) => {
                const option = document.createElement("option");
                option.value = release["id"];
                option.innerHTML = release["tag_name"];
                if (index === 0) {
                    option.innerHTML += " (latest)";
                }
                versionSelector.appendChild(option);
            });
            versionSelector.value = releases[0]["id"];
            localStorage.setItem("releases", JSON.stringify(releases)); // Store data
            updateDownloadLink(releases[0]["id"]);
        })
        .catch((error) => {
            console.error(error);
            alert(error.message);
        });
}

// Video tutorials
const TUTORIALS = [
    {
        title: "Introduction to the tool",
        description:
            "This video will introduce you to some of the basic components of the application.",
        vimeoId: 489006909,
    },
    {
        title: "Filtering",
        description: "This video will introduce you to how to set filters for data.",
        vimeoId: 489008377,
    },
    {
        title: "Creating a dynamic directory structure",
        description:
            "This video will introduce you to one of the core features of this application: creating a dynamic view of our file management system based on file metadata.",
        vimeoId: 489009814,
    },
    {
        title: "Sharing your view of the data management system with others",
        description:
            "Once you've created a dynamic directory structure, set some filters, and drilled down into folders of interest, you may want to share your view with a coworker or just save it for later. This video will show you how.",
        vimeoId: 489010002,
    },
    {
        title: "Modifying the metadata displayed for each file",
        description:
            "This video will show you how to change the columns displayed for each file list. All annotations within the 'Available annotations' list are available to you. Additionally, the columns are resizable.",
        vimeoId: 489009968,
    },
    {
        title: "Opening file(s) in Fiji/ImageJ directly from the BioFile Finder",
        description: `If you are connected to the Allen Institute network (either directly or via Remote PC) <em>and</em> you have the Isilon mounted on your computer,
            select your file(s) of interest within the BioFile Finder, right click on your selection, and select "Open in ImageJ/Fiji."
            <p>
                Alternatively, you can copy and paste (e.g.: ⌘ + C, ⌘ + V) a file path found from the BioFile Finder into your image viewer of choice. To find the file path for a file,
                simply select it: the file path will be displayed in the details pane on the right-hand side of the application.
            </p>`,
        vimeoId: 489019973,
    },
    {
        title: "Programmatic (Pythonic) access and dataset creation",
        description: `If you'd like to work with the files you find in the Explorer in your Python script or program, right-click on a selection of files or on a directory and select
            <code>Generate Python snippet</code>. This will prompt you to create an immutable dataset of your selection's metadata
            that you'll then be able to access programmatically; a code snippet that you can copy and paste will be generated once the dataset has been created.
            <p>
                Datasets are uniquely identified by name and version. If you create a new dataset of the same name as one that already exists, a new version will be
                created for you. Datasets will be accessible for as long as you need them; the "expiration" time of datasets is configurable,
            </p>
            <p>
                For more information regarding programmatic access to datasets created from within the BioFile Finder, refer to the
                <a href="https://aicsbitbucket.corp.alleninstitute.org/projects/SW/repos/aicsfiles-python/browse#querying-by-dataset">aicsfiles-python README</a> (VPN required).
            </p>`,
        vimeoId: 489094834,
    },
    {
        title: "Create CSV of metadata for selection",
        description:
            "This video will show you how to generate a CSV file containing a row for each of your file selections and how to customize the metadata included for each file.",
        vimeoId: 489009842,
    },
];

function buildVideoTutorials() {
    const vimeoPlayer = document.getElementById("vimeo-player");
    const caption = document.getElementById("tutorial-video-caption");
    const tutorialList = document.getElementById("tutorial-list");

    const selectTutorialListItem = (item, li) => {
        // player parameters: https://vimeo.zendesk.com/hc/en-us/articles/360001494447-Using-Player-Parameters
        vimeoPlayer.src = `https://player.vimeo.com/video/${item.vimeoId}?dnt=true`;
        caption.innerHTML = item.description;

        // visually deselect previously selected item
        const prevSelection = document.querySelector("#tutorial-list .tutorial-list-item.selected");
        if (prevSelection) {
            prevSelection.classList.remove("selected");
        }

        // visually select current
        li.classList.add("selected");
    };

    const tutorialListItems = TUTORIALS.map((item) => {
        const li = document.createElement("li");
        li.classList.add("tutorial-list-item", "link");
        li.innerText = item.title;
        li.onclick = () => {
            selectTutorialListItem(item, li);
        };

        return li;
    });

    tutorialList.append(...tutorialListItems);

    // initialize to the first item
    selectTutorialListItem(TUTORIALS[0], tutorialListItems[0]);
}

function initialize() {
    // Fetch releases for the BioFile Finder
    fetchReleases();

    // Determine operating system
    let os;
    if (navigator.appVersion.indexOf("Win") !== -1) {
        os = OS.WINDOWS;
    } else if (navigator.appVersion.indexOf("Mac") !== -1) {
        os = OS.MAC;
    } else if (navigator.appVersion.indexOf("Linux") !== -1) {
        os = OS.LINUX;
    } else {
        os = OS.UNKNOWN;
    }

    // Initialize the operating system selector
    const osSelector = document.getElementById("os-selector");
    Object.values(OS)
        .filter((o) => o !== OS.UNKNOWN)
        .forEach((operatingSystem) => {
            const option = document.createElement("option");
            option.value = operatingSystem;
            option.innerHTML = operatingSystem;
            osSelector.appendChild(option);
        });
    osSelector.value = os;

    // If we could not determine the operating system, report feedback to user
    // & auto-enable changing the operating system manually
    if (os === OS.UNKNOWN) {
        alert(
            "Could not determine operating system, please select a different one using the dropdown"
        );
    }

    // Update dialog
    selectOperatingSystem(os);

    buildVideoTutorials();
}

///////// Initialize App ///////////
initialize();

// if a user clicked on a nav item then clicked the "back button," this will scroll the user back to the top
// of the page
window.addEventListener("hashchange", (event) => {
    const newUrl = new URL(event.newURL);
    if (!newUrl.hash) {
        // scroll to top
        const contentContainer = document.getElementById("secondary-column");
        if (contentContainer) {
            contentContainer.scroll(0, 0);
        }
    }
});
