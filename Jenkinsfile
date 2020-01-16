import groovy.json.JsonOutput

// JOB_TYPE constants
String INTEGRATION = "Integration build"
String VERSION = "Version packages in the monorepo"
String PUBLISH_NPM_LIB = "Publish @aics/fms-file-explore-core to npmjs.org"
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
        choice(name: "JOB_TYPE", choices: [INTEGRATION, VERSION, PUBLISH_NPM_LIB, RELEASE], description: "Which type of job this is.")
        choice(name: "VERSION_BUMP_TYPE", choices: [
            PATCH_VERSION_BUMP,
            MINOR_VERSION_BUMP,
            MAJOR_VERSION_BUMP,
            PREMAJOR_VERSION_BUMP,
            PREMINOR_VERSION_BUMP,
            PREPATCH_VERSION_BUMP,
            PRERELEASE_VERSION_BUMP
        ], description: "Which kind of version bump to perform. Only valid when JOB_TYPE is '${VERSION}'.")
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

                sh "./gradlew setup"
            }
        }

        stage ("integration: lint, typeCheck, test, and build") {
            when {
                expression { !IGNORE_AUTHORS.contains(gitAuthor()) }
                equals expected: INTEGRATION, actual: params.JOB_TYPE
            }
            steps {
                sh "./gradlew lint"
                sh "./gradlew typeCheck"
                sh "./gradlew test"
                sh "./gradlew build"
            }
        }

        stage ("version") {
            when {
                branch "master"
                equals expected: VERSION, actual: params.JOB_TYPE
            }
            steps {
                // Make certain working tree is clean; this could not be the case due to classic, unexplainable package-lock.json changes
                sh "git checkout -- ."

                // Increment version
                sh "./gradlew version -Pbump=${params.VERSION_BUMP_TYPE}"
            }
        }

        stage ("publish @aics/fms-file-explorer-core") {
            when {
                equals expected: PUBLISH_NPM_LIB, actual: params.JOB_TYPE
            }
            steps {
                sh "./gradlew publishArtifact -Pscope=\"--scope=@aics/fms-file-explorer-core\""
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
                    POST_DATA = JsonOutput.toJson([event_type: 'on-demand-release', client_payload: [ref: "${env.BRANCH_NAME}"]])
                }
                // Trigger a repository dispatch event of type "on-demand-release" with the following payload: { "ref": BRANCH_NAME }
                sh 'curl -X POST --fail -H "Authorization: bearer ${GH_TOKEN}" -H "Accept: application/vnd.github.everest-preview+json" -d \'${POST_DATA}\' https://api.github.com/repos/AllenInstitute/aics-fms-file-explorer-app/dispatches'
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