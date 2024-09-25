const queries: Record<string, any> = {
    getUsers: () => `
    FOR user IN user
      FILTER user._id IN @userIds AND user.expoToken != null
      RETURN user
  `
};

export default queries;
