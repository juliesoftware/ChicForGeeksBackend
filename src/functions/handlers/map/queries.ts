export default {
    queryString: () => `
LET friendPlans = (
@includeFriendPlans
? (
    FOR friend, edge IN 1..1 ANY @requestingUser friendship
      FILTER edge.requested != true AND edge.blocked != true
      FOR plan, joinEdge IN 1..1 OUTBOUND friend join
        FILTER joinEdge.joinStatus != 'INVITED' AND joinEdge.joinStatus != 'REQUESTED' AND joinEdge.joinStatus != 'HIDDEN'
        FILTER plan.start <= @to AND plan.end >= @from
        FILTER GEO_CONTAINS(@bounds, [plan.location.lng, plan.location.lat])
      LET friendWithPlanLocation = { "user": friend, "plan": MERGE(plan, { "owner": DOCUMENT(plan.owner) }) }
    RETURN DISTINCT friendWithPlanLocation
    )
: []
)

LET publicPlans = (
@includePublicPlans
? (
    LET blockedUsers = (
    FOR vertex, edge IN ANY @requestingUser friendship
        FILTER edge.blocked == true
        RETURN DISTINCT vertex._id
    )
    
    FOR plan IN plan
    FILTER !plan.private AND plan.owner NOT IN blockedUsers
    FILTER plan.start <= @to AND plan.end >= @from
    FILTER GEO_CONTAINS(@bounds, [plan.location.lng, plan.location.lat])
    
    LET user = DOCUMENT(plan.owner)
    LET ownerWithPlanLocation = { "user": user, "plan": MERGE(plan, { "owner": DOCUMENT(plan.owner) }) }
    
    LET joinDoc = FIRST(
        FOR j IN join
        FILTER j._from == @requestingUser AND j._to == plan._id
        RETURN j
    )
    
    FILTER joinDoc == null OR joinDoc.joinStatus != "HIDDEN"
    FILTER !(plan._key IN (FOR fp IN friendPlans RETURN fp.plan._key))
    RETURN ownerWithPlanLocation
    )
: []
)

LET colivings = (
  @includeColivings
  ? (
    FOR coliving IN coliving
      FILTER coliving.state != "HIDDEN"
      FILTER GEO_CONTAINS(@bounds, [coliving.location.lng, coliving.location.lat])
    RETURN coliving
  )
  : []
)

LET coworkings = (
  @includeCoworkings
  ? (
    FOR coworking IN coworking
      FILTER coworking.state != "HIDDEN"
      FILTER GEO_CONTAINS(@bounds, [coworking.location.lng, coworking.location.lat])
    RETURN coworking
  )
  : []
)

RETURN { "friendPlans": friendPlans, "publicPlans": publicPlans, "colivings": colivings, "coworkings": coworkings }
`,
};
