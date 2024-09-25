import {CursorData} from "../libs/cursor";
import queryFragments from "../libs/queryFragments";

const queries: Record<string, any> = {
    all: (cursor: CursorData) => `
  LET userId = @userId
  LET friends = (
      FOR v, e IN 1..1 ANY DOCUMENT(user, userId) friendship
        FILTER e.requested != true
          RETURN v._id
  )
  
  LET requestedFriends = (
      FOR v, e IN 1..1 ANY DOCUMENT(user, userId) friendship
        FILTER e.requested == true
          RETURN v._id
  )

  LET friendSuggestions = (
    FOR friend IN friends
      FOR v, e, p IN 1..1 ANY friend friendship
        FILTER v._id != userId && v._id NOT IN friends && v._id NOT IN requestedFriends
        FILTER e.requested != true AND e.blocked != true
        RETURN v
  )
  
  LET distinctIds = (
      FOR suggestionId IN friendSuggestions
          COLLECT user = suggestionId INTO grouped
          RETURN {user: user, mutualFriendCount: LENGTH(grouped)}
  )
  
  FOR user IN distinctIds 
      SORT user.mutualFriendCount DESC 
      ${queryFragments.pagination(cursor)}
      RETURN MERGE(user.user, {mutualFriendsCount: user.mutualFriendCount})
  
  `,
    suggestionByLocation: (cursor: CursorData) => `
    LET userId = @userId
    LET requestingUser = DOCUMENT(userId)
  
    LET friends = (
        FOR v, e IN 1..1 ANY requestingUser friendship 
            RETURN v._id
    )
    
    FOR u IN user
      FILTER u.location != null
      FILTER u._id != userId && u._id NOT IN friends && u._id
      FILTER DISTANCE(
          requestingUser.location.lat, 
          requestingUser.location.lng, 
          u.location.lat, 
          u.location.lng) 
      <= 100000
      ${queryFragments.pagination(cursor)}
      RETURN u
  `,
    randomUser: (cursor: CursorData) => `
  LET userId = @userId
  LET friends = (
      FOR v, e IN 1..1 ANY DOCUMENT(user, userId) friendship 
          RETURN v._id
  )   
  
  FOR u IN user
      FILTER u._id != userId && u._id NOT IN friends
      SORT RAND()
      ${queryFragments.pagination(cursor)}
      RETURN u
  `
};

export default queries;
