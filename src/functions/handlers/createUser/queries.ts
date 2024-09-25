export default {
    findUserByUsername: () => `
    FOR v IN user
      FILTER (v.username != null && LOWER(v.username) == @username)
      RETURN v
  `
};