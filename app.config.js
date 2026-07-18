module.exports = ({ config }) => {
  const isGitHubPages = process.env.GITHUB_PAGES === 'true';

  return {
    ...config,
    web: {
      ...config.web,
      ...(isGitHubPages ? { output: 'single' } : {}),
    },
    experiments: {
      ...config.experiments,
      ...(isGitHubPages ? { baseUrl: '/PocketSub' } : {}),
    },
  };
};
