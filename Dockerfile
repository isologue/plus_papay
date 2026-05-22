FROM node:20-bookworm

WORKDIR /app

ENV NODE_ENV=production
ENV DEBIAN_FRONTEND=noninteractive
ENV PLAYWRIGHT_BROWSERS_PATH=/ms-playwright

RUN printf 'Acquire::Retries "5";\nAcquire::http::Timeout "60";\nAcquire::https::Timeout "60";\n' > /etc/apt/apt.conf.d/80-retries

COPY package.json package-lock.json ./
RUN npm ci --omit=dev
RUN npx playwright install --with-deps chromium || (apt-get update && npx playwright install --with-deps chromium)

COPY . .

RUN mkdir -p /app/product_files /app/debug_screenshots

EXPOSE 3000

CMD ["npm", "start"]
