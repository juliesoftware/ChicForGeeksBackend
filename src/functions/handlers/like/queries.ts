export default {
    findLiked: () => `
  FOR v IN INBOUND document(plan, @plan) liked RETURN v
`,
};
