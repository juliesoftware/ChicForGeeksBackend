import {CursorData} from "../libs/cursor";
import queryFragments from "../libs/queryFragments";

const queries: Record<string, any> = {
    all: (cursor: CursorData) => `
    // Subquery to get the list of blocked users for the requester
    LET blockedUsers = (
        FOR f, edge IN ANY DOCUMENT(user, @requesterId) friendship
            FILTER edge.blocked == true
            RETURN f._id
    )
    
    FOR v IN user
        // Filter based on name or username
        FILTER (LIKE(LOWER(v.name), CONCAT(@query,"%"), true) || LIKE(LOWER(v.username), CONCAT(@query,"%"), true))
        // Ensure the user is not in the blocked list
        && v._id NOT IN blockedUsers
      
        // Determine if the user is a friend (ignoring friendships where requested=true)
        LET isFriend = (
            FOR f, edge IN ANY DOCUMENT(user, @requesterId) friendship
                FILTER f._id == v._id && edge.requested != true
                RETURN 1
        )
      
        // Order by friends first, then by other criteria if needed (e.g., name)
        SORT LENGTH(isFriend) DESC, v.name
      
        // Apply pagination
        ${queryFragments.pagination(cursor)}
    
    RETURN v
  `,
    exact: () => `
  FOR v IN user FILTER v.username == @query
  RETURN v
  `,
    random: (cursor: CursorData) => `
    LET requester = @requester
    
    FOR user IN user
        FILTER user._id != requester
        SORT RAND()
        ${queryFragments.pagination(cursor)}
        RETURN user
  `
};

export default queries;
