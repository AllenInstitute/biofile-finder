import Tutorial from "../../../entity/Tutorial";

export const SHARE_VIEW_TUTORIAL = new Tutorial("Sharing current view (URL)")
    .addStep({
        targetId: Tutorial.COPY_URL_BUTTON_ID,
        message:
            "Copy your current view (i.e. your combination of filters, sorts, and open files) by clicking here. This will automatically copy the URL to your clipboard (like when you press Ctrl+C)",
    })
    .addStep({
        targetId: Tutorial.URL_BOX_ID,
        message: "Paste a copied view (URL) here and press Enter to have it load",
    });
