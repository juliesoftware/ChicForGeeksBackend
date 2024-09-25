export default {
    findUsersWithExpiringPlan: () => `
    LET currentDate = DATE_NOW()
    
    FOR u IN user
    FILTER u.expoToken != null
    
    // Check if the user has any plans with an end date after the current date
    LET latestPlan = (
        FOR j IN join
            FILTER j._from == u._id
            FILTER j.joinStatus != 'INVITED' 
                && j.joinStatus != 'REQUESTED' 
                && j.joinStatus != 'HIDDEN'
            FOR p IN plan
                FILTER j._to == p._id
                FILTER p.end != null && DATE_TIMESTAMP(p.end) > currentDate
                SORT p.end DESC
                LIMIT 1
                RETURN p
    )
    
    FILTER LENGTH(latestPlan) > 0
    
    LET lastNotification = (
        FOR n IN notified
            FILTER n._from == u._id && n.notificationType == "PLAN_REMINDER"
            SORT n.created_at DESC
            LIMIT 1
            RETURN n.created_at
    )
    
    FILTER LENGTH(lastNotification) == 0
    
    LET planEndDate = DATE_TIMESTAMP(latestPlan[0].end)
    FILTER DATE_DIFF(currentDate, planEndDate, 'days') <= 14
    
    RETURN {
        "user": u,
        "plan": latestPlan[0]
    }
`,
    findUsersWithoutPlan: () => `
    LET currentDate = DATE_TRUNC(DATE_NOW(), "day")
    LET cooldownPeriod = 14 * 24 * 60 * 60 * 1000
    
    FOR u IN user
        FILTER u.expoToken != null
    
        // Check if the user has any plans with an end date after the current date
        LET latestEndingPlan = (
            FOR j IN join
                FILTER j._from == u._id
                FILTER j.joinStatus != 'INVITED' 
                    && j.joinStatus != 'REQUESTED' 
                    && j.joinStatus != 'HIDDEN'
                FOR p IN plan
                    FILTER j._to == p._id
                    FILTER p.end != null
                    SORT p.end DESC
                    LIMIT 1
                    RETURN p
        )[0]
        
        FILTER latestEndingPlan != null AND currentDate > DATE_TRUNC(DATE_TIMESTAMP(latestEndingPlan.end), "day")        
        LET lastNotification = (
            FOR n IN notified
                FILTER n._from == u._id && n.notificationType == "NO_MORE_PLANS"
                SORT n.created_at DESC
                LIMIT 1
                RETURN n
        )
        
        FILTER LENGTH(lastNotification) == 0 OR 
        (DATE_DIFF(DATE_TIMESTAMP(lastNotification[0].created_at), currentDate, 'days') > 14
        AND lastNotification[0].reminderCounter < 2)
    
        RETURN {
            "user": u
        }
`,

    insertPlanReminderNotification: () => `
  INSERT {
        _from: @userId, 
        _to: @userId, 
        notificationType: "PLAN_REMINDER", 
        text: "Consider adding a new plan", 
        created_at: DATE_NOW(),
        expireAt: DATE_ADD(DATE_NOW(), 14, "d"),  // Add 14 days to the current date
        seen: true
    } INTO notified
`,
    insertNoPlansNotification: () => `
    UPSERT { _from: @userId, notificationType: "NO_MORE_PLANS" }
    INSERT { 
        _from: @userId, 
        _to: @userId, 
        notificationType: "NO_MORE_PLANS", 
        text: "Time for new adventures", 
        created_at: DATE_ISO8601(DATE_NOW()), 
        seen: true, 
        reminderCounter: 1 
    }
    UPDATE { reminderCounter: OLD.reminderCounter + 1 }
    IN notified
`
};
