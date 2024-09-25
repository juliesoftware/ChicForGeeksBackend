import queryFragments from "../libs/queryFragments";


export default {
    single: () => `
    RETURN ${queryFragments.planReturn("DOCUMENT(plan,@plan)")}
  `,
    findJoined: (userId: string = "") =>
        `
  FOR v, e, p IN 1..2 INBOUND DOCUMENT(plan, @plan) join
    OPTIONS { order: 'bfs', uniqueVertices:'global', edgeCollections:['join'], vertexCollections:['user'] }
    FILTER (
      IS_SAME_COLLECTION(p.edges[0],"join") && e.joinStatus != 'INVITED' && e.joinStatus != 'REQUESTED' && e.joinStatus != 'HIDDEN'
    )
    RETURN {join: e, user: v}
  `,
    findOverlapped: (latitude: number = 0, longitude: number = 0, start: string = "", end: string = "") =>
        `
  FOR v, e, p IN 1..2 OUTBOUND DOCUMENT(user,@user) join, ANY friendship
    OPTIONS { order: 'bfs', uniqueVertices:'global', edgeCollections:['join','friendship'], vertexCollections:['plan','user'] }
    FILTER ((IS_SAME_COLLECTION(p.edges[0],'join') && p.edges[0].joinStatus != 'INVITED')
     || (IS_SAME_COLLECTION(p.edges[0],"friendship") && p.edges[0].requested != true && p.edges[0].blocked != true))
      && IS_SAME_COLLECTION(v,'plan') && e._from != @user
      ${end || start ? " && " : ""}
       ${end ? `v.start < '${end}' ${start ? "&&" : ""}` : ""}
       ${start ? `v.end > '${start}' ` : ""}
      LET loc = FIRST(FOR lq, lqe IN INBOUND v attached RETURN lq)
      FILTER IS_IN_POLYGON([[${latitude - 0.5}, ${longitude - 0.5}],[${latitude - 0.5},${longitude + 0.5}], [${latitude + 0.5},${longitude + 0.5}], [${latitude + 0.5},${longitude - 0.5}]], TO_NUMBER(loc.lat), TO_NUMBER(loc.lng))
    RETURN distinct {user: document(e._from), plan: v}
  `,
    user: () => `
    RETURN DOCUMENT(user,@user)
  `,
    findNotifications: () => `
  return COUNT (FOR v, e IN INBOUND document(user, @user) notified
  Filter e.seen == false
  RETURN e)
  `,
    addVisitedCountry: () => `
    LET user = DOCUMENT(@userId)
    LET countryToAdd = @countryToAdd
    
    LET updatedVisitedCountries = (
      user.visitedCountries == null OR LENGTH(user.visitedCountries) == 0
      ? [countryToAdd]
      : UNION_DISTINCT(user.visitedCountries, [countryToAdd])
    )
    
    UPDATE user WITH { visitedCountries: updatedVisitedCountries } IN user
    RETURN NEW
  `,
    inviteUsers: () => `
    FOR userId IN @userIds
      INSERT {
        _from: userId,
        _to: @planId,
        joinStatus: "INVITED"
      } INTO join
  `
};
