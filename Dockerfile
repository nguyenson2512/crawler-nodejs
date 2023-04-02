FROM node:16



ENV CHROMIUM_PATH /usr/bin/chromium-browser
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD true

WORKDIR /usr/src/app
COPY package*.json ./
RUN npm install

RUN apt-get update \
  && apt-get install -y wget gnupg \
  && wget -q -O - https://dl-ssl.google.com/linux/linux_signing_key.pub | apt-key add - \
  && echo "deb [arch=amd64] http://dl.google.com/linux/chrome/deb/ stable main" >> /etc/apt/sources.list.d/google-chrome.list \
  && echo "deb http://deb.debian.org/debian buster-backports main" >> /etc/apt/sources.list \
  && apt-get update \
  && apt-cache policy google-chrome-stable \
  && apt-cache policy chromium \
  && apt-get install -y google-chrome-stable chromium=90.0.4430.212-1~deb10u1 \
  && rm -rf /var/lib/apt/lists/*

COPY . .
EXPOSE 4000

CMD [ "node", "app.js" ]
