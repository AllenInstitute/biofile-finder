import Tutorial from "../../entity/Tutorial";

export const SHARE_VIEW_TUTORIAL = new Tutorial(
    "Sharing current query as URL",
    "How to share your current query (i.e. your filters/sorts/open folders etc.)"
)
    .addStep({
        targetId: Tutorial.SHARE_BUTTON_ID,
        message:
            'Copy your current view (i.e. your combination of filters, sorts, and open files) by clicking the "Shareable Link" option under the "Share" menu. This will automatically copy the URL to your clipboard (like when you press Ctrl+C).',
    })
    .addStep({
        targetId: Tutorial.ADD_QUERY_BUTTON_ID,
        message:
            'If in a web browser, paste the link into your URL bar in a new tab. Otherwise, create a new query by clicking the "+ ADD" button, selecting "New data source", and pasting or typing a URL into the textbox. Hit "Enter" to load the URL, and click "Load".',
    });
