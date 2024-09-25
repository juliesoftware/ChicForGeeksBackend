const queries: Record<string, any> = {
    all: () => `
    LET phoneNumbers = @phoneNumbers
    LET callingUserId = @callingUserId
    
    LET friends = (FOR v, e IN 1..1 ANY DOCUMENT(user, callingUserId) friendship
      LET status = 
        e.requested == true && e._from == callingUserId ? "REQUESTED" :
        e.requested == true && e._to == callingUserId ? "REQUESTED_BY" :
        e.blocked == true && e._from == callingUserId ? "BLOCKED" :
        e.blocked == true && e._to == callingUserId ? "BLOCKED_BY" :
        "FRIEND"
        
      RETURN {id: v._id, status: status}
    )
    
    LET phoneNumberSearchResult = (FOR p IN phoneNumbers
        LET user = (
            FOR u IN user
                FILTER u.phoneNumber.digits == p.digits
                RETURN u
        )[0]
        
        LET friendStatus = FIRST(
            FOR friend IN friends 
                FILTER user != null && friend.id == user._id 
                RETURN friend.status
            )
        
        RETURN {
            phoneNumber: p,
            user: user,
            friendshipStatus: friendStatus == null ? "STRANGER" : friendStatus
        }
    )
    
    RETURN phoneNumberSearchResult
  `
};

export default queries;
