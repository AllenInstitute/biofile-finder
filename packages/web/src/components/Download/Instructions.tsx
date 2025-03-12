import * as React from "react";

export enum OS {
    WINDOWS = "Windows",
    MAC = "Mac",
    LINUX = "Linux",
}

interface Props {
    os: OS | undefined;
}

/**
 * Componenet for rendering OS specific installation instructions for this app
 */
export default function Instructions(props: Props) {
    if (props.os === OS.WINDOWS) {
        return (
            <ul>
                <li>Click the &quot;Download&quot; button to the left</li>
                <li>
                    Move the downloaded executable from your Downloads folder to a more durable
                    location. Note that ITO prevents executables from being stored <i>directly</i>{" "}
                    on either your Desktop or in your Documents folder. The executable can, however,
                    be placed within a folder in either location (e.g.{" "}
                    <code>Desktop\\FMS Explorer\\explorer.exe</code>)
                </li>
                <li>
                    <strong>Recommendation:</strong> store the executable in someplace like{" "}
                    <code>C:\\Users\\someuser\\FMS Explorer\\</code>. Once there, you can
                    right-click on the .exe and select &quot;Send to&quot; &gt; &quot;Desktop
                    (create shortcut)&quot; to make it more convenient to find
                </li>
                <li>
                    <strong>If on Windows 10:</strong> the <i>first</i> time you run the
                    application, you&apos;ll see a blue pop-up warning that &quot;Windows protected
                    your PC.&quot; To continue, click &quot;More Info,&quot; then press the
                    &quot;Run anyway&quot; button
                </li>
            </ul>
        );
    }

    if (props.os === OS.MAC) {
        return (
            <ul>
                <li>Click the &quot;Download&quot; button to the left</li>
                <li>
                    <figure className="figure installation-instr">
                        <img
                            className="screenshot"
                            src="resources/macos-open-with-diskimagemounter.png"
                        />
                        <figcaption className="figure-caption">
                            When prompted by your web browser, select &apos;Open with
                            DiskImageMounter (default)
                        </figcaption>
                    </figure>
                </li>
                <li>
                    <figure className="figure installation-instr">
                        <img
                            className="screenshot"
                            src="resources/macos-drag-into-applications.png"
                        />
                        <figcaption className="figure-caption">
                            Drag and drop the BioFile Finder icon onto the Applications folder icon.
                            If prompted to &quot;Keep Both,&quot; &quot;Stop,&quot; or
                            &quot;Replace,&quot; choose &quot;Replace.&quot;
                        </figcaption>
                    </figure>
                </li>
                <li>Open Finder, and locate the BioFile Finder in Applications.</li>
                <li>
                    Right-click on the BioFile Finder, select &qout;Open.&quot;{" "}
                    <em>You may need to do this twice in order to get to the next step</em>.
                </li>
                <li>
                    <figure className="figure installation-instr">
                        <img className="screenshot" src="resources/macos-open-anyway.png" />
                        <figcaption className="figure-caption">
                            You should be prompted with an alert that reads, &quot;macOS cannot
                            verify the developer of &apos;BioFile Finder&apos;. Are you sure you
                            want to open it?&quot; Select &quot;Open.&quot;
                        </figcaption>
                    </figure>
                </li>
                <li>
                    <figure className="figure installation-instr">
                        <img
                            className="screenshot"
                            src="resources/macos-connect-to-fms-storage.png"
                        />
                        <figcaption className="figure-caption">
                            (Optional) If you&apos;d like to access any of the files found in the
                            BioFile Finder in a third-party application (e.g., opening an image in
                            an image viewer), you&apos;ll need to mount FMS storage on your
                            computer. To do this: <code>Go</code> → <code>Connect to server</code> →
                            enter <code>smb://allen/programs</code> → <code>Connect</code>.
                            <strong>
                                Note! This is only possible when connected to the Allen Institute
                                network; you will be unable to do this over VPN.
                            </strong>
                        </figcaption>
                    </figure>
                </li>
            </ul>
        );
    }

    if (props.os === OS.LINUX) {
        return (
            <ul>
                <li>Click the &quot;Download&quot; button to the left</li>
                <li>Locate the download in file browser</li>
                <li>Right-click the download</li>
                <li>Select the &quot;Properties&quot; dropdown option</li>
                <li>Click the &quot;Permissions&quot; tab</li>
                <li>Ensure &quot;Allow executing file as program&quot; is checked</li>
                <li>Click to open as you would any other application</li>
            </ul>
        );
    }

    return (
        <p>
            Sorry, we couldn&apos;t determine your operating system. Please contact software for
            assistance.
        </p>
    );
}
