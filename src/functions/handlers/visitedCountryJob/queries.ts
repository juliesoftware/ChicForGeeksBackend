const queries: Record<string, any> = {
    runJob: () => `
    LET currentDate = DATE_TRUNC(DATE_NOW(), "day")
    
    FOR plan IN plan
        FILTER DATE_TRUNC(plan.start, "day") == currentDate
        FOR join IN join
            FILTER join._to == plan._id && !(join.joinStatus IN ["HIDDEN", "INVITED", "REQUESTED"])
            FOR user IN user
                FILTER join._from == user._id
                LET newVisitedCountries = APPEND(user.visitedCountries, plan.location.country, true)
                UPDATE user WITH { visitedCountries: newVisitedCountries } IN user
  `
};

export default queries;
