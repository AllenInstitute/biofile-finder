import Tutorial from "../../../entity/Tutorial";

export const SHARE_VIEW_TUTORIAL = new Tutorial("Sharing current view (URL)")
    .addStep({
        targetId: Tutorial.SHARE_BUTTON_ID,
        message:
            'Copy your current view (i.e. your combination of filters, sorts, and open files) by the "Shareable Link" option under the "Share" menu here. This will automatically copy the URL to your clipboard (like when you press Ctrl+C).',
    })
    .addStep({
        targetId: Tutorial.ADD_QUERY_BUTTON_ID,
        message:
            'If in a web browser, paste the link into your URL bar in a new tab. Otherwise, start a new query from a URL by clicking the New Query + button then "Import from URL" then pasting or typing a URL into the textbox. Press Enter to load the query.',
    });
