export default {
    findJoined: () => `
  FOR v, e, p IN INBOUND DOCUMENT(plan,@plan) join
    OPTIONS { order: 'bfs', uniqueVertices:'global', edgeCollections:['join'], vertexCollections:['user'] }
    FILTER (
      IS_SAME_COLLECTION(p.edges[0],"join") && e.joinStatus != 'INVITED' && e.joinStatus != 'REQUESTED' && e.joinStatus != 'HIDDEN'
      && (LIKE(v.name, CONCAT(@query,"%"), true) || LIKE(v.username, CONCAT(@query,"%"), true))
    )
    RETURN v
`,
    findRequested: () => `
  FOR v, e, p IN INBOUND DOCUMENT(plan,@plan) join
    OPTIONS { order: 'bfs', uniqueVertices:'global', edgeCollections:['join'], vertexCollections:['user'] }
    FILTER (
      IS_SAME_COLLECTION(p.edges[0],"join") && e.joinStatus == 'REQUESTED'
      && (LIKE(v.name, CONCAT(@query,"%"), true) || LIKE(v.username, CONCAT(@query,"%"), true))
    )
    RETURN v
`,
    findInvited: () => `
  FOR v, e, p IN INBOUND DOCUMENT(plan,@plan) join
    OPTIONS { order: 'bfs', uniqueVertices:'global', edgeCollections:['join'], vertexCollections:['user'] }
    FILTER (
      IS_SAME_COLLECTION(p.edges[0],"join") && e.joinStatus == 'INVITED'
      && (LIKE(v.name, CONCAT(@query,"%"), true) || LIKE(v.username, CONCAT(@query,"%"), true))
    )
    RETURN v
`,
};
