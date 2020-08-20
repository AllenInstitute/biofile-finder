const OS = {
    WINDOWS: "Windows",
    MAC: "Mac",
    LINUX: "Linux",
    UNKNOWN: "Unknown",
};
const FILE_TYPE_FOR_OS = {
    [OS.WINDOWS]: "exe",
    [OS.MAC]: "dmg",
    [OS.LINUX]: "AppImage"
};
const INSTRUCTIONS_FOR_OS = {
    [OS.WINDOWS]: [
        "Click the 'Download' button to the left",
        "Locate the download in your file browser and attempt to open as usual",
        "Click to open as you would any other application",
        'When prompted, select that you trust this application and would like to "Run anyway"'
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
            Drag and drop the FMS File Explorer icon onto the Applications folder icon. If prompted to 'Keep Both,' 'Stop,' or 'Replace,' choose 'Replace.'
            </figcaption>
        </figure>
        `,
        "Open Finder, and locate the FMS File Explorer in Applications.",
        "Right-click on the FMS File Explorer, select 'Open.' <em>You may need to do this twice in order to get to the next step</em>.",
        `
        <figure class="figure installation-instr">
            <img class="screenshot" src="resources/macos-open-anyway.png">
            <figcaption class="figure-caption">
            You should be prompted with an alert that reads, "macOS cannot verify the developer of 'FMS File Explorer'. Are you sure you want to open it?" Select "Open."
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
        "Click to open as you would any other application"
    ]
};
const REPO_OWNER = "AllenInstitute";
const REPO = "aics-fms-file-explorer-app";

function updateDownloadLink(releaseIdAsString) {
    const releaseId = parseInt(releaseIdAsString, 10);
    const releases = JSON.parse(localStorage.getItem('releases'));
    const release = releases.filter(r => r['id'] === releaseId)[0];
    const operatingSystem = document.getElementById('os-selector').value;
    // Disable the download button if we have an unknown OS
    if (operatingSystem === OS.UNKNOWN) {
        const downloadButton = document.getElementById("download-button");
        downloadButton.disabled = true;
    } else {
        const assetForOs = release['assets'].filter(a => (
            a['name'].endsWith(FILE_TYPE_FOR_OS[operatingSystem])
        ))[0];
        const downloadLink = document.getElementById("download-link");
        downloadLink.href = assetForOs['browser_download_url'];
        downloadLink.download = assetForOs['name'];
    }
}

function selectOperatingSystem(os) {
    document.getElementById('download-button').innerHTML = `Download for ${os}`;
    document.getElementById('installation-instructions').innerHTML = `Installation instructions for ${os}`;
    const instructionsElement = document.getElementById('instructions');
    instructionsElement.innerHTML = '';
    INSTRUCTIONS_FOR_OS[os].forEach(instruction => {
        const paragraph = document.createElement("li");
        paragraph.innerHTML = instruction;
        instructionsElement.appendChild(paragraph);
    });
    const versionSelector = document.getElementById("version-selector");
    versionSelector.value && updateDownloadLink(versionSelector.value);
}

// Fetch the list of releases for the FMS File Explorer & initialize related features
function fetchReleases() {
    fetch(`https://api.github.com/repos/${REPO_OWNER}/${REPO}/releases`)
        .then((response) => {
            if (!response.ok) {
                throw Error(response.statusText);
            }
            return response.json();
        })
        .then((data) => {
            const releases = data.sort((a, b) => b['created_at'].localeCompare(a['created_at']))
            const versionSelector = document.getElementById("version-selector");
            releases.forEach((release, index) => {
                const option = document.createElement('option');
                option.value = release['id'];
                option.innerHTML = release['tag_name'];
                if (index === 0) {
                    option.innerHTML += " (latest)";
                }
                versionSelector.appendChild(option);
            });
            versionSelector.value = releases[0]['id'];
            localStorage.setItem('releases', JSON.stringify(releases)); // Store data
            updateDownloadLink(releases[0]['id']);
        })
        .catch((error) => {
            console.error(error);
            alert(error.message);
        });
}

function initialize() {
    // Fetch releases for the FMS File Explorer
    fetchReleases();

    // Determine operating system
    let os;
    if (navigator.appVersion.indexOf("Win") !==-1) {
        os = OS.WINDOWS;
    } else if (navigator.appVersion.indexOf("Mac") !==-1) {
        os = OS.MAC;
    } else if (navigator.appVersion.indexOf("Linux") !==-1) {
        os = OS.LINUX;
    } else {
        os = OS.UNKNOWN;
    }

    // Initialize the operating system selector
    const osSelector = document.getElementById('os-selector');
    Object.values(OS).filter(o => o !== OS.UNKNOWN).forEach(operatingSystem => {
        const option = document.createElement('option');
        option.value = operatingSystem;
        option.innerHTML = operatingSystem;
        osSelector.appendChild(option);
    });
    osSelector.value = os;

    // If we could not determine the operating system, report feedback to user
    // & auto-enable changing the operating system manually
    if (os === OS.UNKNOWN) {
        alert("Could not determine operating system, please select a different one using the dropdown");
    }

    // Update dialog
    selectOperatingSystem(os);
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
