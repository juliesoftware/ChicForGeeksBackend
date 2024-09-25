import {GQLGetPlansResponse, GQLUser, QueryToUserPlansArgs} from "../../../../schemas";
import {AppSyncResolverEvent} from "aws-lambda";
import queries from "./queries";
import {CursorData, generatePageResult, validateAndPrepareCursorData,} from "../libs/cursor";
import {axiosPost} from "../libs/axiosRequest";

function mapResult(plan: any): GQLGetPlansResponse {
    return {
        ...plan.plan,
        id: plan.plan._id,
        owner: {
            ...plan.owner,
            id: plan.owner?._id ?? "",
            name: plan.owner?.name ?? ""
        },
        counters: plan.counters,
        location: plan.location,
        joined: plan.joined.map(mapJoinedResult),
        hasLiked: plan.hasLiked,
        joinStatus: (plan.joinStatus && plan.joinStatus.length > 0) ? plan.joinStatus[0] : null,
    };
}

function mapJoinedResult(user: any): GQLUser {
    return {
        ...user,
        id: user._id,
    };
}

export async function handler(
    event: AppSyncResolverEvent<QueryToUserPlansArgs>
): Promise<GQLGetPlansResponse> {
    let cursor: CursorData = validateAndPrepareCursorData(event.arguments?.page);
    let usrId = event.arguments.userId;
    console.log({
        message: "User plans has been invoked",
        userId: event.arguments.userId
    });
    if (!event.arguments.userId && event.arguments.userName) {
        usrId = (await axiosPost(queries.singleByUserName(event.arguments.userName), {}, false)).data.result[0]._id
    }

    console.log("Start is: " + event.arguments.start + " and end is: " + event.arguments.end)

    const response = await axiosPost(
        queries.all(cursor, event.arguments.desc, event.arguments.start, event.arguments.end, event.arguments.requester),
        {user: usrId},
        true)

    console.log("Response contains: " + response.data.result.map(mapResult))
    return {
        results: response.data.result.map(mapResult),
        page: generatePageResult(response.data.extra.stats.fullCount, cursor),
    };
}
