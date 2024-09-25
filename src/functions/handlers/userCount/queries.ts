const queries: Record<string, any> = {
    userCount: () => `
    RETURN LENGTH(FOR user IN user RETURN 1)
  `
};

export default queries;
