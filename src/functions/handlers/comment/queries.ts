import queryFragments from "../libs/queryFragments";


export default {
    findCommented: () => `
  FOR v,e IN INBOUND document(plan, @plan) commented
  RETURN ${queryFragments.commentReturn("e")}
`,
};
