const queries: Record<string, any> = {
    getAveragePlanCount: () => `
    LET activePlans = ( 
    FOR plan IN plan
        FILTER plan.end > @currentDate
        RETURN plan._id
    )
    
    LET joinedPlanCount = FIRST(
        FOR joinedPlan IN join
            FILTER joinedPlan._to IN activePlans
            COLLECT WITH COUNT INTO joinCount
            RETURN joinCount
    )
    
    LET userCount = FIRST(
        FOR user IN user
            COLLECT WITH COUNT INTO userCount
            RETURN userCount
    )
        
    RETURN FLOOR(joinedPlanCount/userCount * POW(10, 2)) / POW(10, 2)
  `
};

export default queries;
