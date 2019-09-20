const child_process = require("child_process");
const { promises: fsPromises } = require("fs");
const http = require("http");
const path = require("path");

const { devServer } = require("../webpack/constants");

async function makeBuildDirectory() {
    const buildDir = path.resolve(__dirname, "../", "dist");

    console.log(`Ensuring ${buildDir} exists`);
    try {
        await fsPromises.stat(buildDir);
        console.log(`${buildDir} already exists.`);
        return await Promise.resolve();
    } catch (err) {
        console.log(`${buildDir} does not yet exist--creating.`);
        return await fsPromises.mkdir(buildDir);
    }
}

function startWebpackDevServer() {
    console.log("starting webpack-dev-server");
    child_process.spawn(
        'npx',
        [
            'webpack-dev-server',
            '--config',
            './webpack/webpack.config.js',
            '--env.env',
            'dev'
        ], {
            stdio: 'inherit'
        }
    );
}

function wait(timeout) {
    return new Promise((resolve) => {
        setTimeout(() => {
            resolve()
        }, timeout)
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
            console.log(`Retry ${i} for webpack-dev-server ready status`);
        }
    }

    // couldn't connect to webpack-dev-server after 10 tries: bail
    return Promise.reject();
}

function startBabelWatch() {
    console.log("Starting babel watch of src/main.ts");
    child_process.spawn(
        "npx",
        [
            "babel",
            "src/main.ts",
            "--env-name",
            "commonjs",
            "--out-file",
            "dist/main.js",
            "--watch",
            "--verbose",
            "--source-maps",
        ], {
            stdio: 'inherit'
        }
    );
}

function startElectron() {
    console.log("Starting electron");
    child_process.spawn(
        "npx",
        [
            "electron",
            "."
        ], {
            env: Object.assign({}, process.env, {
                NODE_ENV: "development",
                WEBPACK_DEV_SERVER_PORT: devServer.port,
            })
        }
    );
}

// kick it all off
makeBuildDirectory()
    .then(() => {
        startWebpackDevServer();
        startBabelWatch();
        checkIfWebpackDevServerIsReady()
            .then(() => {
                console.log("webpack-dev-server is up and running");
                startElectron();
            })
            .catch(() => {
                console.error("Failed to connect to webpack-dev-server");
            });
    })
    .catch(() => {
        console.error("Could make build directory. Something has gone very wrong and nobody knows why.");
    });
