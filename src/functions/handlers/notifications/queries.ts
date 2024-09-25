import {CursorData} from "../libs/cursor";
import queryFragments from "../libs/queryFragments";

export default {
    findNotifications: (cursor: CursorData) => `
    FOR v, e IN INBOUND document(user, @user) notified
        FILTER e.notificationType NOT IN ["NO_MORE_PLANS", "PLAN_REMINDER", "FIRST_PLAN_PROMPT", "FRIEND_REQUESTED"]
        SORT e.created_at DESC
        ${queryFragments.pagination(cursor)}
        LET originDoc = LIKE(e._from, 'user/%', true) ? document(user, e._from) : document(plan, e._from)
        LET originLocation = document(location, FIRST(FOR j IN attached FILTER e._from == j._to RETURN j)._from)
        LET relatedDoc = LIKE(e.related, 'user/%', true) ? document(user, e.related) : document(plan, e.related)
        LET otherDoc = LIKE(e.other, 'user/%', true) ? document(user, e.other) : document(plan, e.other)
        RETURN {
          notification: e,
          origin: originDoc,
          originLocation: originLocation,
          related: relatedDoc,
          other: otherDoc
        }
`,
    countUnseenNotifications: () => `
    RETURN LENGTH(
        FOR v, e IN INBOUND document(user, @user) notified
        FILTER e.seen == false
        RETURN e
    )
`,
};
