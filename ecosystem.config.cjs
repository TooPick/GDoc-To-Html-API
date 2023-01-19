module.exports = {
  apps: [
    {
      name: "gdoc-to-html",
      script: "./index.js",
      instances: 1,
      autorestart: true,
      max_memory_restart: "1G",
    },
  ],
};
