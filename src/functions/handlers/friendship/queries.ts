import queryFragments from "../libs/queryFragments";
import {CursorData} from "../libs/cursor";

export default {
    findFriends: (cursor: CursorData) => `
  FOR v, e, p IN ANY DOCUMENT(user,@user) friendship
    OPTIONS { order: 'bfs', uniqueVertices:'global', edgeCollections:['friendship'], vertexCollections:['user'] }
    FILTER (
      IS_SAME_COLLECTION(p.edges[0],"friendship") && e.requested != true && e.blocked != true
      && (LIKE(v.name, CONCAT(@query,"%"), true) || LIKE(v.username, CONCAT(@query,"%"), true))
    )
    ${queryFragments.pagination(cursor)}
    RETURN v
`,
    findBlocked: (cursor: CursorData) => `
  FOR v, e, p IN OUTBOUND DOCUMENT(user,@user) friendship
    OPTIONS { order: 'bfs', uniqueVertices:'global', edgeCollections:['friendship'], vertexCollections:['user'] }
    FILTER  e.blocked == true && (LIKE(v.name, CONCAT(@query,"%"), true) || LIKE(v.username, CONCAT(@query,"%"), true))
    ${queryFragments.pagination(cursor)}
    RETURN v
`,
    findBlockedBy: (cursor: CursorData) => `
  FOR v, e, p IN INBOUND DOCUMENT(user,@user) friendship
    OPTIONS { order: 'bfs', uniqueVertices:'global', edgeCollections:['friendship'], vertexCollections:['user'] }
    FILTER  e.blocked == true && (LIKE(v.name, CONCAT(@query,"%"), true) || LIKE(v.username, CONCAT(@query,"%"), true))
    ${queryFragments.pagination(cursor)}
    RETURN v
`,
    findRequestedFriends: (cursor: CursorData) => `
  FOR v, e, p IN OUTBOUND DOCUMENT(user,@user) friendship
    OPTIONS { order: 'bfs', uniqueVertices:'global', edgeCollections:['friendship'], vertexCollections:['user'] }
    FILTER  e.blocked != true && e.requested == true && (LIKE(v.name, CONCAT(@query,"%"), true) || LIKE(v.username, CONCAT(@query,"%"), true))
    ${queryFragments.pagination(cursor)}
    RETURN v
`,
    findRequestedByFriends: (cursor: CursorData) => `
  FOR v, e, p IN INBOUND DOCUMENT(user,@user) friendship
    OPTIONS { order: 'bfs', uniqueVertices:'global', edgeCollections:['friendship'], vertexCollections:['user'] }
    FILTER  e.blocked != true && e.requested == true && (LIKE(v.name, CONCAT(@query,"%"), true) || LIKE(v.username, CONCAT(@query,"%"), true))
    ${queryFragments.pagination(cursor)}
    RETURN v
`,
    singleByUserName: (userName: string) => `
FOR v IN user
FILTER (v.username != null && v.username == '${userName}')
RETURN v
`,
};
