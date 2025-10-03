const config = {
  org: process.env.SENTRY_ORG || 'your-sentry-org',
  project: process.env.SENTRY_PROJECT || 'naraddon-nextjs',
  authToken: process.env.SENTRY_AUTH_TOKEN,
  dryRun: process.env.SENTRY_DRY_RUN === '1',
  silent: true,
  widenClientFileUpload: true,
  release: {
    setCommits: {
      auto: true,
    },
  },
  sourcemaps: [
    {
      assets: '.next/static/chunks/**/*',
      ignore: ['**/*.map'],
    },
  ],
};

export default config;