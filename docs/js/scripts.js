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
    [OS.WINDOWS]: ["Locate the download in your file browser and attempt to open as usual",
                   "Click to open as you would any other application",
                   'When prompted, select that you trust this application and would like to "Run anyway"'],
    [OS.MAC]: ["Locate the download in your file browser and attempt to open as usual",
               "Click to open as you would any other application",
               "When prompted, drag and drop the app into the applications folder",
               'Locate the app "FMS File Explorer" in your applications and right click it',
               'Select "Open" to allow the mac to trust it'],
    [OS.LINUX]: ["Locate the download in file browser",
                 "Right-click the download",
                 'Select the "Properties" dropdown option',
                 'Click the "Permissions" tab',
                 'Ensure "Allow executing file as program" is checked',
                 "Click to open as you would any other application"]
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
    document.getElementById('instructions-title').innerHTML = `Setup instructions for ${os}`;
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
