import queryFragments from "../libs/queryFragments";
import {CursorData} from "../libs/cursor";

export default {
    all: (cursor: CursorData, desc: boolean = false, start?: string, end?: string, userId: string = "") => `
  FOR v, e IN OUTBOUND DOCUMENT(user, @user) join
  SORT v.start ${desc ? "DESC" : "ASC"}
  FILTER e.joinStatus != 'INVITED' && e.joinStatus != 'REQUESTED' && e.joinStatus != 'HIDDEN'
  ${start && end ? `&& v.start <= '${end}' && v.end >= '${start}'` : ""}
  ${start && !end ? `&& v.end >= '${start}'` : ""}
  ${!start && end ? `&& v.end < '${end}'` : ""}
  ${cursor.count != 0 ? queryFragments.pagination(cursor) : ""}
  RETURN ${queryFragments.planReturn("v", `${userId}`)}
`,
    singleByUserName: (userName: string) => `
  FOR v IN user
  FILTER (v.username != null && v.username == '${userName}')
  RETURN v
  `,
};
