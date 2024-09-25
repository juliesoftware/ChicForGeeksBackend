import {CursorData} from "../libs/cursor";
import queryFragments from "../libs/queryFragments";

const queries: Record<string, any> = {
    countrySearch: (cursor: CursorData) => `
    LET startRange = DATE_SUBTRACT(DATE_NOW(), 1, 'months')
    LET endRange = DATE_ADD(DATE_NOW(), 3, 'months')
    FOR doc IN plan
      FILTER doc.start >= startRange AND doc.end <= endRange
      FILTER doc.location.country != null
      COLLECT country = doc.location.country WITH COUNT INTO count
      SORT count DESC
      ${queryFragments.pagination(cursor)}
      RETURN {country, count}
  `
};

export default queries;
