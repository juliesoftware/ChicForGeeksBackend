const queries: Record<string, any> = {
    getUsers: () => `
    FOR user IN user
      FILTER user._id IN @userIds
      RETURN user
  `
};

export default queries;
