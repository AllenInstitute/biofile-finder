// JOB_TYPE constants
String BUILD_ARTIFACT = "BUILD_ARTIFACT"
String DEPLOY_ARTIFACT = "DEPLOY_ARTIFACT"
String PROMOTE_ARTIFACT = "PROMOTE_ARTIFACT"

// VERSION_BUMP_TYPE constants
// The values of these constants must match the acceptable args to `lerna version`
String MAJOR_VERSION_BUMP = "major"
String MINOR_VERSION_BUMP = "minor"
String PATCH_VERSION_BUMP = "patch"

// DEPLOYMENT_TYPE constants
// The values of these constants must match values from jenkinstools.deploy.DeployEnv enum
String STAGING_DEPLOYMENT = "staging"
String PRODUCTION_DEPLOYMENT = "production"

// GIT_TAG constant
// Used as default value for GIT_TAG parameter, and checked for in validation stage
String GIT_TAG_SENTINEL = "invalid_git_tag"

Map DEPLOYMENT_TARGET_TO_S3_BUCKET = [(STAGING_DEPLOYMENT): "staging.<CHANGE-ME>.allencell.org", (PRODUCTION_DEPLOYMENT): "production.<CHANGE-ME>.allencell.org"]
Map DEPLOYMENT_TARGET_TO_MAVEN_REPO = [(STAGING_DEPLOYMENT): "maven-snapshot-local", (PRODUCTION_DEPLOYMENT): "maven-release-local"]

String[] IGNORE_AUTHORS = ["jenkins", "Jenkins User", "Jenkins Builder"]

pipeline {
    options {
        disableConcurrentBuilds()
        timeout(time: 1, unit: "HOURS")
    }
    agent {
        node {
            label "docker"
        }
    }
    triggers {
        pollSCM("H */4 * * 1-5")
    }
    parameters {
        // N.b.: For choice parameters, the first choice is the default value
        // See https://github.com/jenkinsci/jenkins/blob/master/war/src/main/webapp/help/parameter/choice-choices.html
        choice(name: "JOB_TYPE", choices: [BUILD_ARTIFACT, PROMOTE_ARTIFACT, DEPLOY_ARTIFACT], description: "Which type of job this is.")
        choice(name: "VERSION_BUMP_TYPE", choices: [PATCH_VERSION_BUMP, MINOR_VERSION_BUMP, MAJOR_VERSION_BUMP], description: "Which kind of version bump to perform.")
        choice(name: "DEPLOYMENT_TYPE", choices: [STAGING_DEPLOYMENT, PRODUCTION_DEPLOYMENT], description: "Target environment for deployment. Will determine which S3 bucket assets are deployed to and how the release history is written. This is only used if JOB_TYPE is ${DEPLOY_ARTIFACT}.")
        gitParameter(name: "GIT_TAG", defaultValue: GIT_TAG_SENTINEL, type: "PT_TAG", sortMode: "DESCENDING_SMART", description: "Select a Git tag specifying the artifact which should be promoted or deployed. This is only used if JOB_TYPE is ${PROMOTE_ARTIFACT} or ${DEPLOY_ARTIFACT}")
    }
    environment {
        VENV_BIN = "/local1/virtualenvs/jenkinstools/bin"
        PYTHON = "${VENV_BIN}/python3"
    }
    stages {
        stage ("initialize") {
            steps {
                this.notifyBB("INPROGRESS")
                // without credentialsId, the git parameters plugin fails to communicate with the repo
                git url: "${env.GIT_URL}", branch: "${env.BRANCH_NAME}", credentialsId: "9b2bb39a-1b3e-40cd-b1fd-fee01ebef965"
                sh "./gradlew setup"
            }
        }

        stage ("fail if invalid job parameters") {
            when {
                expression { !IGNORE_AUTHORS.contains(gitAuthor()) }
                anyOf {
                    // Promote jobs need a git tag; GIT_TAG_SENTINEL is the defaultValue that isn't valid
                    expression { return params.DEPLOYMENT_TYPE == PROMOTE_ARTIFACT && params.GIT_TAG == GIT_TAG_SENTINEL }

                    // Deploy jobs need a git tag; GIT_TAG_SENTINEL is the defaultValue that isn't valid
                    expression { return params.DEPLOYMENT_TYPE == DEPLOY_ARTIFACT && params.GIT_TAG == GIT_TAG_SENTINEL }
                }
            }
            steps {
                error("Invalid job parameters for ${params.DEPLOYMENT_TYPE} job: Must select a valid git tag.")
            }
        }

        stage ("lint, typeCheck, and test") {
            when {
                expression { !IGNORE_AUTHORS.contains(gitAuthor()) }
                equals expected: BUILD_ARTIFACT, actual: params.JOB_TYPE
            }
            steps {
                sh "./gradlew lint"
                sh "./gradlew typeCheck"
                sh "./gradlew test"
            }
        }

        stage ("build and push: non-master branch") {
            when {
                expression { !IGNORE_AUTHORS.contains(gitAuthor()) }
                not { branch "master" }
                equals expected: BUILD_ARTIFACT, actual: params.JOB_TYPE
            }
            environment {
                DEPLOYMENT_ENV = "staging"
            }
            steps {
                script {
                    CHANGED_SCOPES = sh(script: "./gradlew -q changedScopes", returnStdout: true).trim()
                }

                // Build artifacts in all repos that have changed since last release (prior to running version command
                // above) and publish those artifacts appropriately.
                sh "./gradlew publishArtifact -Pscope='${CHANGED_SCOPES}'"
            }
        }

        stage ("build and push: master branch") {
            when {
                expression { !IGNORE_AUTHORS.contains(gitAuthor()) }
                branch "master"
                equals expected: BUILD_ARTIFACT, actual: params.JOB_TYPE
            }
            environment {
                DEPLOYMENT_ENV = "production"
            }
            steps {
                script {
                    CHANGED_SCOPES = sh(script: "./gradlew -q changedScopes", returnStdout: true).trim()
                }

                // Increment version
                sh "./gradlew version -Pbump=${params.VERSION_BUMP_TYPE}"

                // Build artifacts in all repos that have changed since last release (prior to running version command
                // above) and publish those artifacts appropriately.
                sh "./gradlew publishArtifact -Pscope='${CHANGED_SCOPES}'"
            }
        }

        stage ("promote") {
            when {
                equals expected: PROMOTE_ARTIFACT, actual: params.JOB_TYPE
            }
            steps {
                sh "${PYTHON} ${VENV_BIN}/promote_artifact -t maven -g ${params.GIT_TAG}"
            }
        }

        stage ("deploy") {
            when {
                equals expected: DEPLOY_ARTIFACT, actual: params.JOB_TYPE
            }
            steps {
                script {
                    ARTIFACTORY_REPO = DEPLOYMENT_TARGET_TO_MAVEN_REPO[params.DEPLOYMENT_TYPE]
                    S3_BUCKET = DEPLOYMENT_TARGET_TO_S3_BUCKET[params.DEPLOYMENT_TYPE]
                }
                // TODO.
                sh "${PYTHON} ${VENV_BIN}/deploy_artifact -d --branch=${env.BRANCH_NAME} --deploy-env=${params.DEPLOYMENT_TYPE} maven-tgz S3 --artifactory-repo=${ARTIFACTORY_REPO} --bucket=${S3_BUCKET} ${params.GIT_TAG}"
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