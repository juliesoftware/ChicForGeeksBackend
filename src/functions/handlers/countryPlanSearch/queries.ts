import {CursorData} from "../libs/cursor";
import queryFragments from "../libs/queryFragments";

export default {
    public: (cursor: CursorData, country: string) => `
      for v in plan FILTER v.private != true
      LET loc = FIRST(FOR lq, lqe IN INBOUND v attached RETURN lq)
filter loc.country LIKE '${country}%'
SORT v.updated_at DESC, v.created_at DESC
${queryFragments.pagination(cursor)}
RETURN ${queryFragments.planReturn("v")}
  `,
};
