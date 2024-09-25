import queryFragments from "../libs/queryFragments";

export default {
    findLike: () => `
  FOR v, e, p IN 1..2 OUTBOUND DOCUMENT(user,@requester) liked
    OPTIONS { order: 'bfs', uniqueVertices:'global', edgeCollections:['liked'], vertexCollections:['user', 'plan', 'comment'] }
    FILTER (
      IS_SAME_COLLECTION(p.edges[0],"liked") && v._id == @object
    )
    RETURN e
`,
    findComment: () => `
  return ${queryFragments.commentReturn("document(commented, @object)")}
`,
    findPlan: () => `
  return ${queryFragments.planReturn("document(plan, @object)")}
`,
    findNotifications: () => `
return COUNT (FOR v, e IN INBOUND document(user, @user) notified
Filter e.seen == false
RETURN e)
`,
    findUser: () => `
RETURN DOCUMENT(user,@userId)
`
};
