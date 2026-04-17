module.exports = {
  apps: [
    {
      name: "offonthesquare-storefront",
      cwd: "/home/hendo420/OffOnTheSquare/storefront",
      script: "npm",
      args: "start -- --hostname 0.0.0.0 --port 3000",
      env: {
        NODE_ENV: "production",
      },
    },
  ],
};
