export default {
    findJoin: () => `
  FOR v, e, p IN 1..2 INBOUND DOCUMENT(plan,@plan) join
    OPTIONS { order: 'bfs', uniqueVertices:'global', edgeCollections:['join'], vertexCollections:['user'] }
    FILTER (
      IS_SAME_COLLECTION(p.edges[0],"join") && v._id == @user
    )
    RETURN e
`,
    getPlan: () => `
  RETURN DOCUMENT(plan,@plan)
  `,
    user: () => `
    RETURN DOCUMENT(user,@user)
  `,
    findNotifications: () => `
  return COUNT (FOR v, e IN INBOUND document(user, @user) notified
  Filter e.seen == false
  RETURN e)
  `
};
