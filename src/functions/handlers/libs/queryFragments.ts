import {CursorData} from "./cursor";

function planCounters(plan: string) {
    return `{
			joined: length(FOR j, je IN INBOUND ${plan} join FILTER je.status == "joining" RETURN j)+1,
			likes: length(FOR j, je IN INBOUND ${plan} \`liked\` RETURN j),
			requests: length(FOR j, je IN INBOUND ${plan} join FILTER je.status == "requested" RETURN j),
			invites: length(FOR j, je IN INBOUND ${plan} join FILTER je.status == "invited" RETURN j),
			comments: length(FOR j, je IN INBOUND ${plan} commented RETURN j)
	}`;
}

function findJoin(plan: string, userId: string) {
    return `
  (FOR q, r, s IN INBOUND ${plan} join
  OPTIONS { order: 'bfs', uniqueVertices:'global', edgeCollections:['join'], vertexCollections:['user'] }
  FILTER (
    IS_SAME_COLLECTION(s.edges[0],"join") && q._id == '${userId}'
  )
  RETURN (r.joinStatus != 'INVITED' && r.joinStatus != 'REQUESTED' && r.joinStatus != 'HIDDEN') ? 'JOINED' : r.joinStatus)
`;
}

function findJoined(plan: string) {
    return `
  (FOR x, y, z IN INBOUND ${plan} join
    OPTIONS { order: 'bfs', uniqueVertices:'global', edgeCollections:['join'], vertexCollections:['user'] }
    FILTER (
      IS_SAME_COLLECTION(z.edges[0],"join") && y.joinStatus != 'INVITED' && y.joinStatus != 'REQUESTED' && y.joinStatus != 'HIDDEN'
    )
    RETURN x)
`;
}

export default {
    pagination: (cursor: CursorData) => `
    LIMIT ${cursor.offset}, ${cursor.count}
  `,
    planReturn: (plan: string, userId?: string) => `
    {
        plan: ${plan},
        owner: document(
            user, 
            (length(${plan}.owner) > 0 ? ${plan}.owner : null)
        ),
        location: FIRST(
            FOR j, je IN INBOUND ${plan} attached 
            RETURN j
        ),
        counters: ${planCounters(plan)},
        hasLiked: ${userId ? `
            (length(
                FOR j, je IN INBOUND ${plan} liked 
                FILTER(je._from == '${userId}') 
                RETURN j
            ) > 0 ? true : false)` : false},
        joinStatus: ${userId ? `${findJoin(plan, userId)}` : null},
        joined: ${findJoined(plan)}
    }`,
    // userHasLiked: (plan: string, userId: string) =>
    // `length(FOR j, je IN INBOUND ${plan} liked RETURN j )`
    userReturn: (user: string) => `{
    user: ${user},
    location: FIRST(FOR j, je IN INBOUND ${user} attached RETURN j)
  }`,
    commentReturn: (comment: string) => `{
    comment: ${comment},
    owner: document(user, (length(${comment}._from) > 0 ? ${comment}._from : null)),
    plan: document(plan, (length(${comment}._to) > 0 ? ${comment}._to : null)),
  }`,
    likeReturn: (like: string) => `{
    like: ${like},
    owner: document(user, (length(${like}._from) > 0 ? ${like}._from : null))
  }
  `,
    joinReturn: (join: string) => `
  {
    join: ${join},
    user: document(user, ${join}._from)
  }
  `,
    planCounters,
};
