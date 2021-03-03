/**
 * The purpose of this script is to coordinate the start up of all of the processes necessary for development
 * in the context of Electron. This includes:
 *   - webpack-dev-server, which watches, recompiles, and serves code run in Electron's renderer process
 *   - webpack, which compiles and watches the code run in Electron's main process
 *   - electron itself, which should only be started when the others are up and running
 *
 * This script is intended to be run in the foreground. Sending a SIGINT to this script will clean up the child
 * processes spawned herein.
 */

const childProcess = require("child_process");
const http = require("http");
const os = require("os");
const process = require("process");

const { devServer } = require("../webpack/constants");

function getNpmBinDir() {
    try {
        const output = childProcess.spawnSync("npm", ["bin"], {
            encoding: "utf-8",
            shell: process.platform == "win32",
        });
        if (output.stdout.endsWith(os.EOL) || output.stdout.endsWith("\n")) {
            return output.stdout.slice(0, output.stdout.length - 1);
        }
        return output.stdout;
    } catch (err) {
        console.err("Failed to determine npm bin location");
    }
}

function startMainWatcher(npmBin) {
    console.log("Starting watcher for main process");
    childProcess.spawn(
        `${npmBin}/webpack`,
        ["--watch", "--config", "./webpack/webpack.main.config.js", "--env.env", "development"],
        {
            shell: true,
            stdio: "inherit",
        }
    );
}

function startRendererDevServer(npmBin) {
    console.log("Starting webpack-dev-server for renderer process");
    childProcess.spawn(
        `${npmBin}/webpack-dev-server`,
        ["--config", "./webpack/webpack.renderer.config.js", "--env.env", "development"],
        {
            shell: true,
            stdio: "inherit",
        }
    );
}

function wait(timeout) {
    return new Promise((resolve) => {
        setTimeout(() => {
            resolve();
        }, timeout);
    });
}

async function checkIfWebpackDevServerIsReady() {
    console.log("Checking webpack-dev-server ready status");
    const MAX_RETRIES = 10;
    for (let i = 0; i <= MAX_RETRIES; i++) {
        try {
            return await new Promise((resolve, reject) => {
                const req = http.get(`http://${devServer.host}:${devServer.port}`, (res) => {
                    if (res.statusCode !== 200) {
                        reject();
                    } else {
                        resolve();
                    }
                });

                req.on("error", reject);
            });
        } catch (err) {
            const timeout = 2000; // in ms; 2 seconds
            await wait(timeout);
            console.log(`Retry ${i} for renderer to be ready`);
        }
    }

    // couldn't connect to webpack-dev-server after 10 tries: bail
    return Promise.reject();
}

function startElectron(npmBin) {
    console.log("Starting electron");
    childProcess.spawn(`${npmBin}/electron`, ["."], {
        env: Object.assign({}, process.env, {
            NODE_ENV: "development",
            WEBPACK_DEV_SERVER_PORT: devServer.port,
        }),
        shell: true,
    });
}

try {
    // kick it all off
    const npmBin = getNpmBinDir();
    startMainWatcher(npmBin);
    startRendererDevServer(npmBin);
    checkIfWebpackDevServerIsReady().then(() => {
        console.log("renderer webpack-dev-server is up and running");
        startElectron(npmBin);
    });
} catch (e) {
    console.error(e);
}
