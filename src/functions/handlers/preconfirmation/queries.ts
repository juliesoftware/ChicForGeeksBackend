export default {
    findUserByUsername: (userName: string) => `
  FOR v IN user
  FILTER (v.username != null && LOWER(v.username) == '${userName}')
  RETURN v
`,
};
