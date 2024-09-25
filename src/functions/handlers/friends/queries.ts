import queryFragments from "../libs/queryFragments";
import {CursorData} from "../libs/cursor";

export default {
    all: (cursor: CursorData) => `
    LET requester = @requester
    LET requestee = @requestee
    
    LET requesterFriends = (
      FOR v, e IN 1..1 ANY DOCUMENT(user, requester) friendship
        LET friendshipStatus = e.requested ? "REQUESTED" : e.blocked ? "BLOCKED" : "FRIEND"
        RETURN MERGE(v, { friendshipStatus: friendshipStatus })
    )
    
    LET requesteeFriends = (
      FOR v, e IN 1..1 ANY DOCUMENT(user, requestee) friendship
        FILTER e.requested != true
        RETURN v
    )
    
    LET mutualFriends = (
      FOR friend IN requesteeFriends
        LET mutual = DOCUMENT("friendship", CONCAT(requestee, "/", friend._key))
        LET friendshipStatus = mutual.requested ? "FRIEND" : mutual.blocked ? "BLOCKED" : "STRANGER"
        RETURN MERGE(DOCUMENT("user", friend._key), { friendshipStatus: friendshipStatus })
    )
    
    LET fullList = UNION(requesterFriends, mutualFriends)
    
    LET friendStatus = {
      FRIEND: 1,
      REQUESTED: 2,
      BLOCKED: 3,
      STRANGER: 4
    }
    
    LET cleanedList = (
        FOR friend IN fullList
        FILTER friend._id != requestee
        SORT friendStatus[friend.friendshipStatus], friend.name ASC
        ${queryFragments.pagination(cursor)}
        RETURN friend
    )
    
    RETURN cleanedList
`,
};
