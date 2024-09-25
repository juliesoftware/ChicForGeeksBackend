const queries: Record<string, any> = {
    single: () => `
    LET requester = @requester
    LET requestee = @requestee
    
    LET requesterFriends = (
    FOR v, e IN 1..1 ANY DOCUMENT(user, requester) friendship
      FILTER e.requested != true
        RETURN v
    )
    
    LET requesteeFriends = (
    FOR v, e IN 1..1 ANY DOCUMENT(user, requestee) friendship
      FILTER e.requested != true
        RETURN v
    )
      
    LET mutualFriendCount = LENGTH(INTERSECTION(requesterFriends, requesteeFriends))
    LET userWithMutualFriendCount = MERGE(DOCUMENT(user,requestee), {mutualFriendsCount: mutualFriendCount})
    
    RETURN  
    {
        user: userWithMutualFriendCount,
        location: FIRST(FOR j, je IN INBOUND userWithMutualFriendCount attached RETURN j)
    }
  `,
        byIdOrUsername: () => `
    LET requesteeId = @requesteeId
    LET username = @username
    LET requesterId = @requesterId
    LET currentDate = DATE_NOW()
    
    LET requestee = (username != null AND username != "" ? FIRST(
        FOR u IN user
          FILTER u.username == username
          RETURN u
    ) : DOCUMENT(requesteeId))
    
    LET requesterFriends = (
        FOR v, e IN 1..1 ANY DOCUMENT(user, requesterId) friendship
          FILTER e.requested != true
          RETURN v
    )
    
    LET requesteeFriends = (
        FOR v, e IN 1..1 ANY DOCUMENT(user, requestee._id) friendship
          FILTER e.requested != true
          RETURN v
    )
    
    LET mutualFriendsCount = LENGTH(INTERSECTION(requesterFriends, requesteeFriends))
    
    LET friendship = FIRST(
        FOR e IN friendship
            FILTER (e._from == requesterId AND e._to == requestee._id) OR (e._from == requestee._id AND e._to == requesterId)
            RETURN e
    )
    
    
    LET friendshipStatus = (
        friendship == null ? "STRANGER" :
        (friendship.blocked ? (friendship._to == requesterId ? "BLOCKED_BY" : "BLOCKED") :
        (friendship.requested ? (friendship._to == requesterId ? "REQUESTED_BY" : "REQUESTED") : "FRIEND"))
    )
    
    LET firstPlan = FIRST(
      FOR join IN join
        FILTER join._from == requestee._id && !(join.joinStatus IN ["HIDDEN", "INVITED", "REQUESTED"])
        FOR plan IN plan
          FILTER join._to == plan._id
          && DATE_TIMESTAMP(plan.start) <= currentDate
          && DATE_TIMESTAMP(plan.end) >= currentDate
          SORT plan.start
          RETURN plan.location
    )
    
    RETURN firstPlan != null
      ? MERGE(requestee, { "location": firstPlan, "mutualFriendsCount": mutualFriendsCount, "friendshipStatus": friendshipStatus })
      : MERGE(requestee, { "mutualFriendsCount": mutualFriendsCount, "friendshipStatus": friendshipStatus })
  `,
        findFriendship: () => `
    FOR v, e, p IN ANY DOCUMENT(user,@requester) friendship
      OPTIONS { order: 'bfs', uniqueVertices:'global', edgeCollections:['friendship'], vertexCollections:['user'] }
      FILTER (
        IS_SAME_COLLECTION(p.edges[0],"friendship") && v._id == @requestee
      )
      RETURN e
  `
};

export default queries;
