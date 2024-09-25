import queryFragments from "../libs/queryFragments";


export default {
    single: () => `
    RETURN ${queryFragments.userReturn("DOCUMENT(user,@user)")}
  `,
    location: () =>
        `
    FOR j, je IN INBOUND DOCUMENT(user,@user) attached
    RETURN j
  `,
};
