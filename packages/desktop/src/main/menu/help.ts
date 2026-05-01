import { app, dialog, MenuItemConstructorOptions } from "electron";

export function getHelpMenu(): MenuItemConstructorOptions {
    return {
        role: "help",
        submenu: [
            {
                label: "About BioFile Finder",
                click: () => {
                    dialog.showMessageBox({
                        type: "info",
                        title: "About BioFile Finder",
                        message: "BioFile Finder",
                        detail: `Version: ${app.getVersion()}\n\nAn application designed to simplify access and exploration of data produced by the Allen Institute for Cell Science.`,
                        buttons: ["OK"],
                    });
                },
            },
        ],
    };
}
