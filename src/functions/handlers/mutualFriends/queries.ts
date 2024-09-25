const queries: Record<string, any> = {
    all: () => `
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
  
  RETURN INTERSECTION(requesterFriends, requesteeFriends)
  `
};

export default queries;
