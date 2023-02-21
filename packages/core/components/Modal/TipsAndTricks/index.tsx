import * as React from "react";

import BaseModal from "../BaseModal";
import { ModalProps } from "..";

/**
 * Dialog meant to explain some tips and tricks
 */
export default function TipsAndTricks({ onDismiss }: ModalProps) {
    const body = (
        <>
            <h4>Performance</h4>
            <p>
                Some searches can be slow. This tends to occur because of the amount of files which
                can almost always be narrowed down. For example, 5 million files might have
                annotation &quot;Kind&quot; with a value of &quot;CZI Image&quot;, instead of
                searching by File name through all those files narrow them down with another
                annotation or just by something simple like the date they were uploaded. Use the
                &quot;View&quot; feature at the top of the app to automatically narrow files down by
                the date they were uploaded relative to todays date.
            </p>
            <h4>How to</h4>
            <p>
                Unsure how a feature works? Check out the &quot;Tutorials&quot; section of the help
                menu, a feature might have some hidden aspects you are not aware of or there might
                even be features there you did not know about.
            </p>
            <h4>Getting help</h4>
            <p>
                The software team is, at the time of writing this, using Slack as the means of
                reaching us for help with our apps. Post whatever your question may be in our
                support channel and you should receive help quickly, nothing it too niche to ask
                about.
            </p>
        </>
    );

    return <BaseModal body={body} onDismiss={onDismiss} title="Tips & Tricks" />;
}
