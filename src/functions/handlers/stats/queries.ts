const queries: Record<string, any> = {
    stats: () => `
    LET startTime = DATE_ISO8601(@from)
    LET endTime = DATE_ISO8601(@to)
    LET userId = @userId
    
    // Fetch all the joined plans for the specific user within the given time frame
    LET userPlans = (
        FOR join IN join
            FILTER join._from == userId
            AND join.joinStatus NOT IN ["HIDDEN", "INVITED", "REQUESTED"]
            FOR plan IN plan
                FILTER join._to == plan._id
                AND (plan.end >= startTime AND plan.start <= endTime)
                RETURN plan
    )
    
    LET countryDates = (
        FOR plan IN userPlans
            LET duration = DATE_DIFF(plan.start, plan.end, 'days') + 1
            LET days = (
                FOR i IN 0..duration - 1
                    LET day = DATE_ADD(plan.start, i, 'days')
                    FILTER day >= startTime AND day <= endTime
                    RETURN day
            )
            RETURN { country: plan.location.country, dates: days }
    )
    
    LET countryDurations = (
        FOR countryData IN countryDates
            COLLECT country = countryData.country INTO groups = countryData.dates
            LET uniqueDates = UNIQUE(FLATTEN(groups))
            LET durationDays = LENGTH(uniqueDates)
            RETURN { country, durationDays }
    )
    
    LET topCountries = (
        FOR countryDuration IN countryDurations
            SORT countryDuration.durationDays DESC
            LIMIT 5
            RETURN countryDuration
    )
    
    // Determine the favorite country (most time spent)
    LET favoriteCountry = (
        FOR countryDuration IN countryDurations
            SORT countryDuration.durationDays DESC
            LIMIT 1
            RETURN countryDuration
    )[0]
    
    // Determine the most frequent travel buddy with user image
    LET topTravelBuddies = (
        LET travelBuddies = (
            FOR plan IN userPlans
                FOR join IN join
                    FILTER join._to == plan._id
                    AND join._from != userId
                    AND join.joinStatus NOT IN ["HIDDEN", "INVITED", "REQUESTED"]
                    COLLECT buddyId = join._from AGGREGATE count = COUNT(join)
                    RETURN { buddyId, count }
        )
        FOR buddy IN travelBuddies
        SORT buddy.count DESC
        LIMIT 5
        FOR user IN user
            FILTER user._id == buddy.buddyId
            RETURN { 
                "name": user.name,
                "sharedPlansCount": buddy.count,
                "image": user.image,
            }
    )
    
    // Calculate the travel distance
    LET travelDistance = (
        LET plans = userPlans
    
        LET totalDistance = (
            FOR i IN 0..LENGTH(plans) - 2
            LET startPlan = plans[i]
            LET endPlan = plans[i+1]
            LET distance = FLOOR(DISTANCE(startPlan.location.lat, startPlan.location.lng, endPlan.location.lat, endPlan.location.lng) / 1000)
            COLLECT AGGREGATE totalDist = SUM(distance)
            RETURN totalDist
        )[0]
    
        RETURN totalDistance
    )[0]
    
    // Determine the unique countries the user visited
    LET uniqueCountries = UNIQUE(userPlans[*].location.country)
    
    // Determine the user's percentile
    LET totalUsers = LENGTH(user)
    LET usersAbove = (
        FOR usr IN user
            LET joinedPlans = (
                FOR join IN join
                    FILTER join._from == usr._id
                    AND join.joinStatus NOT IN ["HIDDEN", "INVITED", "REQUESTED"]
                    FOR plan IN plan
                        FILTER join._to == plan._id
                        AND plan.start >= startTime AND plan.end <= endTime
                        RETURN plan.location.country
            )
            LET uniqueCountriesCount = LENGTH(UNIQUE(joinedPlans))
            FILTER uniqueCountriesCount >= LENGTH(UNIQUE(userPlans[*].location.country))
            RETURN usr
    )
    LET percentile = 100 * (LENGTH(usersAbove) / totalUsers)
        
    LET visitedCountriesInTimeframe = UNIQUE(
        FOR plan IN userPlans
            RETURN plan.location.country
    )
    
    // Check if visitedCountriesInTimeframe is not null or empty
    LET validVisitedCountriesInTimeframe = (LENGTH(visitedCountriesInTimeframe) > 0) ? visitedCountriesInTimeframe : []
    
    // Calculate the visit count for each country by all users
    LET allUsersCountryVisitCounts = (
        FOR user IN user
            FOR visitedCountry IN (user.visitedCountries ? user.visitedCountries : [])
                COLLECT country = visitedCountry WITH COUNT INTO count
                RETURN { country, count }
    )
    
    // Find the rarest country that the user has visited
    LET rareCountry = (LENGTH(validVisitedCountriesInTimeframe) > 0) ? FIRST(
        FOR countryVisit IN allUsersCountryVisitCounts
            FILTER countryVisit.country IN validVisitedCountriesInTimeframe
            SORT countryVisit.count ASC
            LIMIT 1
            LET userPercentage = ROUND((countryVisit.count / totalUsers) * 100)
            RETURN { 
                "country": countryVisit.country, 
                "userPercentage": userPercentage
            }
    ) : NULL
    
    RETURN {
        "uniqueCountries": uniqueCountries,
        "topCountries": topCountries,
        "favoriteCountry": favoriteCountry,
        "percentile": percentile,
        "plansAttended": LENGTH(userPlans),
        "travelDistance": travelDistance,
        "topTravelBuddies": topTravelBuddies,
        "rareCountry": rareCountry
    }
`
};

export default queries;
