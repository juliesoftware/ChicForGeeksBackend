import {CursorData} from "../libs/cursor";
import queryFragments from "../libs/queryFragments";

const queries: Record<string, any> = {
    distanceSearch: (cursor: CursorData) => `
    LET centerPoint = { latitude: TO_NUMBER(@lat), longitude: TO_NUMBER(@lng) }
    LET maxDistance = TO_NUMBER(@distance)  // Parsed as meters
    
    FOR c IN coliving
      LET distance = DISTANCE(c.location.lat, c.location.lng, centerPoint.latitude, centerPoint.longitude)
      FILTER c.state != "HIDDEN"
      FILTER distance <= maxDistance
      LET isVerified = (c.state == "VERIFIED") ? 1 : 0
      LET isWithin20km = (distance <= 20000) ? 1 : 0
      SORT isVerified * isWithin20km DESC, distance DESC
      ${queryFragments.pagination(cursor)}
      RETURN c
  `
};

export default queries;
