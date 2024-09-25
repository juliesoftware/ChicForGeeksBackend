export default {
    findFriendship: () => `
  FOR v, e, p IN ANY DOCUMENT(user,@requester) friendship
    OPTIONS { order: 'bfs', uniqueVertices:'global', edgeCollections:['friendship'], vertexCollections:['user'] }
    FILTER (
      IS_SAME_COLLECTION(p.edges[0],"friendship") && v._id == @requestee
    )
    RETURN e
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
