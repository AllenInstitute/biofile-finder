import groovy.json.JsonOutput

// JOB_TYPE constants
String INTEGRATION = "Integration build"
String VERSION_AND_PUBLISH = "Version packages in the monorepo and publish @aics/fms-file-explore-core to npmjs.org"
String RELEASE = "Trigger release workflow on Github"

// VERSION_BUMP_TYPE constants
// The values of these constants must match the acceptable args to `lerna version`
String MAJOR_VERSION_BUMP = "major"
String MINOR_VERSION_BUMP = "minor"
String PATCH_VERSION_BUMP = "patch"
String PREMAJOR_VERSION_BUMP = "premajor"
String PREMINOR_VERSION_BUMP = "preminor"
String PREPATCH_VERSION_BUMP = "prepatch"
String PRERELEASE_VERSION_BUMP = "prerelease"

String[] IGNORE_AUTHORS = ["jenkins", "Jenkins User", "Jenkins Builder"]

pipeline {
    options {
        disableConcurrentBuilds()
        timeout(time: 1, unit: "HOURS")
    }
    agent any
    triggers {
        pollSCM("H */4 * * 1-5")
    }
    parameters {
        // N.b.: For choice parameters, the first choice is the default value
        // See https://github.com/jenkinsci/jenkins/blob/master/war/src/main/webapp/help/parameter/choice-choices.html
        choice(name: "JOB_TYPE", choices: [INTEGRATION, VERSION_AND_PUBLISH, RELEASE], description: "Which type of job this is.")
        choice(name: "VERSION_BUMP_TYPE", choices: [
            PATCH_VERSION_BUMP,
            MINOR_VERSION_BUMP,
            MAJOR_VERSION_BUMP,
            PREMAJOR_VERSION_BUMP,
            PREMINOR_VERSION_BUMP,
            PREPATCH_VERSION_BUMP,
            PRERELEASE_VERSION_BUMP
        ], description: "Which kind of version bump to perform. Only valid when JOB_TYPE is '${VERSION_AND_PUBLISH}'.")
    }
    stages {
        stage ("initialize") {
            steps {
                this.notifyBB("INPROGRESS")
                // without credentialsId, the git parameters plugin fails to communicate with the repo
                git url: "${env.GIT_URL}", branch: "${env.BRANCH_NAME}", credentialsId: "9b2bb39a-1b3e-40cd-b1fd-fee01ebef965"

                // print the params used to run current job
                print "JOB_TYPE: ${params.JOB_TYPE}"
                print "VERSION_BUMP_TYPE: ${params.VERSION_BUMP_TYPE}"
            }
        }

        stage ("integration: lint, typeCheck, test, and build") {
            agent {
                dockerfile {
                    filename "Dockerfile"
                    additionalBuildArgs "--build-arg USER=`whoami` --build-arg GROUP=jenkins --build-arg UID=`id -u` --build-arg GID=`id -g`"

                    // --cap-add=SYS_ADMIN added to help get around otherwise needing to pass "--no-sandbox" to Chromium used by Electron.
                    // Error you'd see without this:
                    // "Failed to move to new namespace: PID namespaces supported, Network namespace supported, but failed: errno = Operation not permitted"
                    // Reference: https://github.com/jessfraz/dockerfiles/issues/65#issuecomment-145731454, https://ndportmann.com/chrome-in-docker/
                    args '-e HOME=${WORKSPACE} --cap-add=SYS_ADMIN'
                }
            }
            when {
                expression { !IGNORE_AUTHORS.contains(gitAuthor()) }
                equals expected: INTEGRATION, actual: params.JOB_TYPE
            }
            steps {
                sh "npm ci"
                sh "npm run setup"

                // Get around needing to pass "--no-sandbox" to Chromium used by Electron (in headless testing)
                // Error you'd see without this:
                // "The SUID sandbox helper binary was found, but is not configured correctly"
                // Reference: https://github.com/electron/electron/issues/17972#issuecomment-487369441
                sh "chmod 4755 ./node_modules/electron/dist/chrome-sandbox"
                sh "sudo chown root ./node_modules/electron/dist/chrome-sandbox"

                // For each subpackage, run lint, typeCheck, test, and build
                script {
                    def package_dirs = [
                        "packages/fms-file-explorer-core",
                        "packages/fms-file-explorer-electron",
                        "packages/fms-file-explorer-web"
                    ]
                    for (int i = 0; i < package_dirs.size(); ++i) {
                        sh """
                        #!/bin/bash

                        set -e

                        pushd ${package_dirs[i]}
                        npm run lint
                        npm run typeCheck
                        npm run test
                        npm run build
                        popd
                        """.trim()
                    }
                }
            }
        }

        stage ("version and publish") {
            agent {
                dockerfile {
                    filename "Dockerfile"
                    additionalBuildArgs "--build-arg USER=`whoami` --build-arg GROUP=jenkins --build-arg UID=`id -u` --build-arg GID=`id -g`"
                    args '-e HOME=${WORKSPACE}'
                }
            }
            when {
                branch "master"
                equals expected: VERSION_AND_PUBLISH, actual: params.JOB_TYPE
            }
            steps {
                sh "npm ci"
                sh "npm run setup"

                // Increment version
                sh "npx lerna version --yes --no-commit-hooks --exact ${params.VERSION_BUMP_TYPE}"

                // Publish npm lib
                sh "npx lerna run publishArtifact --scope=@aics/fms-file-explorer-core"
            }
        }

        stage ("trigger release") {
            when {
                equals expected: RELEASE, actual: params.JOB_TYPE
            }
            environment {
                GH_TOKEN = credentials("aics-github-token-repo-access")
            }
            steps {
                script {
                    def packageJsonVersion = sh(
                        returnStdout: true,
                        script: "cat ${env.WORKSPACE}/packages/fms-file-explorer-electron/package.json | jq --raw-output '.version'"
                    ).trim()
                    def version = env.BRANCH_NAME == "master" ? packageJsonVersion : env.BRANCH_NAME.replace(["/": "-"])
                    def postData = JsonOutput.toJson([event_type: "on-demand-release", client_payload: [ref: "${env.BRANCH_NAME}", version: "${version}"]])
                    def authHeader = [name: "Authorization", value: "bearer ${GH_TOKEN}"]
                    def acceptHeader = [name: "Accept", value: "application/vnd.github.everest-preview+json"]
                    def response = httpRequest url: "https://api.github.com/repos/AllenInstitute/aics-fms-file-explorer-app/dispatches",
                                               httpMode: "POST",
                                               requestBody: postData,
                                               customHeaders: [authHeader, acceptHeader]

                    if (response.getStatus() >= 400) {
                        throw new Exception("Failed to trigger a release workflow")
                    }
                }
            }
        }
    }
    post {
        always {
            this.notifyBB(currentBuild.result)
        }
        cleanup {
            deleteDir()
        }
    }
}

def notifyBB(String state) {
    // on success, result is null
    state = state ?: "SUCCESS"

    if (state == "SUCCESS" || state == "FAILURE") {
        currentBuild.result = state
    }

    notifyBitbucket commitSha1: "${GIT_COMMIT}",
            credentialsId: "aea50792-dda8-40e4-a683-79e8c83e72a6",
            disableInprogressNotification: false,
            considerUnstableAsSuccess: true,
            ignoreUnverifiedSSLPeer: false,
            includeBuildNumberInKey: false,
            prependParentProjectKey: false,
            projectKey: "SW",
            stashServerBaseUrl: "https://aicsbitbucket.corp.alleninstitute.org"
}

def gitAuthor() {
    sh(returnStdout: true, script: 'git log -1 --format=%an').trim()
}