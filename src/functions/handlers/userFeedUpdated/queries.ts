import {CursorData} from "../libs/cursor";
import queryFragments from "../libs/queryFragments";

export default {
    friends: (cursor: CursorData) => `
    LET userId = @userId  // This is the user for whom we're fetching overlapping trips

    // Step 1: Get friend IDs
    LET friendIds = APPEND(
        (
            FOR v, e IN 1..1 ANY userId friendship
                FILTER e.requested != true
                RETURN v._id
        ),
        [userId]
    )
    
    // Step 2: Fetch trips of the user and their friends
    FOR userTrip IN trip
        FILTER userTrip.owner IN friendIds
    
        // Step 3: For each trip, find overlapping trips by the user and friends
        LET overlappingTrips = (
            FOR friendTrip IN trip
                FILTER friendTrip.owner IN friendIds
                AND DISTANCE(friendTrip.location.lat, friendTrip.location.lng, userTrip.location.lat, userTrip.location.lng) <= 100000
                AND friendTrip.location.country == userTrip.location.country
                AND friendTrip.start <= userTrip.end
                AND friendTrip.end >= userTrip.start
                AND friendTrip._id != userTrip._id  // Exclude the current trip from overlaps
                RETURN {
                    "trip": friendTrip,
                    "owner": friendTrip.owner
                }
        )
    
        // Order by updated and created dates
        SORT userTrip.updated_at DESC, userTrip.created_at DESC
        
        ${queryFragments.pagination(cursor)}
        // Step 4: Return results
        RETURN {
            "userTrip": userTrip.location.country,
            "overlaps": overlappingTrips,
        }
  `,
    public: (cursor: CursorData) => `
    LET userId = @userId  // This is the user for whom we're fetching overlapping trips

    // Step 1: Get friend IDs
    LET friendIds = APPEND(
        (
            FOR v, e IN 1..1 ANY userId friendship
                FILTER e.requested != true
                RETURN v._id
        ),
        [userId]
    )
    
    // Step 2: Fetch trips of the user and their friends
    FOR userTrip IN trip
        FILTER userTrip.private != true
    
        // Step 3: For each trip, find overlapping trips by the user and friends
        LET overlappingTrips = (
            FOR friendTrip IN trip
                FILTER friendTrip.owner IN friendIds
                AND DISTANCE(friendTrip.location.lat, friendTrip.location.lng, userTrip.location.lat, userTrip.location.lng) <= 100000
                AND friendTrip.location.country == userTrip.location.country
                AND friendTrip.start <= userTrip.end
                AND friendTrip.end >= userTrip.start
                AND friendTrip._id != userTrip._id  // Exclude the current trip from overlaps
                RETURN {
                    "trip": friendTrip,
                    "owner": friendTrip.owner
                }
        )
    
        // Order by updated and created dates
        SORT userTrip.updated_at DESC, userTrip.created_at DESC
        
        ${queryFragments.pagination(cursor)}
        // Step 4: Return results
        RETURN {
            "userTrip": userTrip.location.country,
            "overlaps": overlappingTrips,
        }
  `
};
