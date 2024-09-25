const queries: Record<string, any> = {
    exact: () => `
    RETURN DOCUMENT(@coworkingId)
  `
};

export default queries;
