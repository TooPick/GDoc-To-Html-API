FROM node:17-alpine

# Bundle APP files
COPY . .

# Install app dependencies
ENV NPM_CONFIG_LOGLEVEL warn
RUN npm install --production

# Install PM2
RUN npm install pm2 -g

CMD [ "pm2-runtime", "start", "ecosystem.config.cjs" ]
