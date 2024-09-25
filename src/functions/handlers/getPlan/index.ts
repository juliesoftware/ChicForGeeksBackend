import {GQLPlan, QueryToPlanArgs,} from "../../../../schemas";
import {AppSyncResolverEvent} from "aws-lambda";
import queries from "./queries";
import {axiosPost} from "../libs/axiosRequest";

function mapResult(plan: any): GQLPlan {
    return {
        ...plan.plan,
        id: plan.plan._id,
        counters: plan.counters,
        location: plan.location,
        owner: {
            ...plan.owner,
            id: plan.owner?._id ?? "",
            name: plan.owner?.name ?? ""
        },
        hasLiked: plan.hasLiked,
        joinStatus: (plan.joinStatus && plan.joinStatus.length > 0) ? plan.joinStatus[0] : null,
        joined: plan.joined,
    };
}

export async function handler(
    event: AppSyncResolverEvent<QueryToPlanArgs>
): Promise<GQLPlan> {
    const query = queries.single(event.arguments.userId);
    const bindVars = {plan: event.arguments.planId};
    const returnCount = false;

    const response = await axiosPost(query, bindVars, returnCount)
    return mapResult(response.data.result[0]);
}
