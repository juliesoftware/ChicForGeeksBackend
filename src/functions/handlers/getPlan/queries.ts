import queryFragments from "../libs/queryFragments";

export default {
    single: (userId: string = "") => `
    RETURN ${queryFragments.planReturn("DOCUMENT(plan,@plan)", `${userId}`)}
  `,
};
