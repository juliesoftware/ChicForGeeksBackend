import {CursorData} from "../libs/cursor";
import queryFragments from "../libs/queryFragments";

export default {
    public: (cursor: CursorData, userId: string = "", country?: string, sortField: string = "UPDATED_AT", sortDirection: string = "DESC") => `
    LET blockedUsers = (
        FOR vertex, edge IN ANY '${userId}' friendship
            FILTER edge.blocked == true
            RETURN DISTINCT vertex._id
        )

    LET randomFeaturedPlan = (
        FOR v IN plan
            FILTER v.sponsored == true && v.private != true && v.owner NOT IN blockedUsers && DATE_ISO8601(DATE_NOW()) < v.end
            SORT RAND()
            LIMIT 1
        RETURN v
    )

    FOR v IN plan
        FILTER v.private != true
        FILTER v.owner NOT IN blockedUsers
        FILTER (DATE_ISO8601(DATE_NOW()) < v.end && v.created_at < '${cursor.date}')
        ${country ? `FILTER v.location.country == '${country}'` : ""}
        COLLECT planKey = v._key INTO groupedPlans
        LET plan = groupedPlans[0].v
        SORT (plan._id == randomFeaturedPlan[0]._id) DESC,
        ${sortField == "CREATED_AT" ? "plan.created_at" : sortField == "START_DATE" ? "plan.start" : "plan.updated_at"} ${sortDirection},  
        plan.created_at DESC
        ${queryFragments.pagination(cursor)}
        RETURN ${queryFragments.planReturn("plan", `${userId}`)}
  `,
    private: (cursor: CursorData, userId: string = "", country?: string, sortField: string = "UPDATED_AT", sortDirection: string = "DESC") => `
    LET users = UNION([ '${userId}' ], (
        FOR friend, edge IN 1..1 ANY '${userId}' friendship
            FILTER edge.requested != true AND edge.blocked != true
            RETURN friend._id
    ))
    
    LET allSponsoredPlans = (
    FOR v IN plan
        FILTER v.sponsored == true && DATE_ISO8601(DATE_NOW()) < v.end
        RETURN v
    )

    LET randomFeaturedPlan = (
        FOR v IN allSponsoredPlans
            SORT RAND()
            LIMIT 1
        RETURN v
    )

    LET friendPlans = (
        FOR user IN users
            FOR plan, joinEdge IN 1..1 OUTBOUND user join
                FILTER joinEdge.joinStatus NOT IN ['HIDDEN']
                FILTER plan.end >= DATE_ISO8601(DATE_NOW()) AND plan.sponsored != true
                COLLECT planKey = plan._key INTO groupedPlans
                LET plan = groupedPlans[0].plan
                RETURN plan
    )

    LET combinedPlans = UNION_DISTINCT(allSponsoredPlans, friendPlans)

    FOR plan IN combinedPlans
        SORT (plan._id == randomFeaturedPlan[0]._id) DESC,
             ${sortField == "CREATED_AT" ? "plan.created_at" : sortField == "START_DATE" ? "plan.start" : "plan.updated_at"} ${sortDirection},
             plan.created_at DESC
            ${queryFragments.pagination(cursor)}
            RETURN ${queryFragments.planReturn("plan", `${userId}`)}
    `
};
