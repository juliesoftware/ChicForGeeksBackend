export default {
    single: () => `
    RETURN DOCUMENT(commented,@comment)
  `,
    findCommentContext: () => `
    LET user = DOCUMENT(@userId)
    LET plan = DOCUMENT(@planId)
    
    LET joiners = (
        FOR v, e, p IN 1..2 INBOUND DOCUMENT(@planId) join
            OPTIONS { order: 'bfs', uniqueVertices:'global', edgeCollections:['join'], vertexCollections:['user'] }
            FILTER (
              IS_SAME_COLLECTION(p.edges[0],"join") && e.joinStatus NOT IN ['INVITED', 'REQUESTED', 'HIDDEN'] AND v._id != @userId
            )
            RETURN v
    )
    RETURN {"user": user, "plan": plan, "joiners": joiners}
  `,
    findUserByUsername: (userName: any) => `
  FOR v IN user
  FILTER (v.username != null && v.username == '${userName}')
  RETURN v
`,
    findNotifications: () => `
    RETURN COUNT (FOR v, e IN INBOUND document(user, @user) notified
    Filter e.seen == false
    RETURN e)
`,
    insertCommentRelations: () => `
    FOR joinerId IN @joinerIds
        LET commentingUserInfo = DOCUMENT(@commentingUser)
        LET planInfo = DOCUMENT(@planId)
        LET planName = planInfo.name ? planInfo.name : planInfo.location.displayName
        INSERT {
            _from: @planId, 
            _to: joinerId, 
            notificationType: "PLAN_COMMENT", 
            text: CONCAT(commentingUserInfo.name, " commented on the plan ", planName),
            related: @commentingUser, 
            created_at: DATE_ISO8601(DATE_NOW()),
            image: commentingUserInfo.image,
            deepLink: planInfo._id,
            seen: false
        } INTO notified
`
};