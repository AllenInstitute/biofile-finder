FROM ubuntu:20.04

ARG USER=jenkins
ARG GROUP=jenkins
ARG UID=1000
ARG GID=1000

RUN /usr/sbin/groupadd -g ${GID} ${GROUP} && \
    /usr/sbin/useradd -g ${GROUP} -G sudo -N --shell /bin/bash --create-home -u ${UID} ${USER}

RUN apt-get update && apt-get install -y curl && \
    curl -sL https://deb.nodesource.com/setup_12.x | bash - && \
    DEBIAN_FRONTEND=noninteractive apt-get install -y \
    git \
    nodejs \
    sudo \
    xvfb \
    # The following deps were experimentally determined to be required in order to run electron headlessly in this container:
    libglib2.0-0 \
    libxcomposite1 \
    libxcursor1 \
    libxi6 \
    libxtst6 \
    libnss3 \
    libatk1.0-0 \
    libatk-bridge2.0-0 \
    libgdk-pixbuf2.0-0 \
    libgtk-3-0 \
    libgbm1 \
    libasound2 \
    libxss1 && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# Add USER to sudoers to allow for chowning chrome-sandbox (once installed as part of Electron) to root
# Gets around needing to pass "--no-sandbox" to Chromium used by Electron (in headless testing as part of "integration" stage)
# Error you'd see without this:
# "The SUID sandbox helper binary was found, but is not configured correctly"
# Reference: https://github.com/electron/electron/issues/17972#issuecomment-487369441
RUN echo "${USER} ALL=(ALL) NOPASSWD:ALL" | sudo tee /etc/sudoers.d/${USER}
