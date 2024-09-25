export default {
    findUsersToNotify: () => `
    FOR u IN user
        FILTER u.expoToken != null 
    
        LET userPlans = (
            FOR j IN join
                FILTER j._from == u._id
                FILTER j.joinStatus != 'INVITED' 
                    && j.joinStatus != 'REQUESTED' 
                    && j.joinStatus != 'HIDDEN'
                RETURN j
        )
    
        LET previousNotifications = (
            FOR n IN notified
                FILTER n._from == u._id && n.notificationType == "FIRST_PLAN_PROMPT"
                RETURN n
        )
    
        FILTER LENGTH(userPlans) == 0 AND LENGTH(previousNotifications) == 0
        RETURN u
`,
    insertFirstPlanNotification: () => `
  INSERT {
        _from: @user, 
        _to: @user, 
        notificationType: "FIRST_PLAN_PROMPT", 
        text: "Consider creating your first plan", 
        created_at: DATE_NOW(),
        seen: true
    } INTO notified
`
};
