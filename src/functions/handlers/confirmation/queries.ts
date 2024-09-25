export default {
    findUserByEmail: (userName: string, email: string) => `
  FOR v IN user
  FILTER (v.username != null && v.username == '${userName}') || (v.email != null && v.email == '${email}')
  RETURN v
`,
};
