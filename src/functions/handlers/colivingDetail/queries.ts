const queries: Record<string, any> = {
    exact: () => `
    RETURN DOCUMENT(@coliving)
  `
};

export default queries;
