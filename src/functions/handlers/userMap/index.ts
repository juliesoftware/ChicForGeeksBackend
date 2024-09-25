import {GQLGetPlansResponse, QueryToUserMapArgs,} from "../../../../schemas";
import {AppSyncResolverEvent} from "aws-lambda";
import queries from "./queries";
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
        hasLiked: plan.hasLiked,
    };
}

export async function handler(
    event: AppSyncResolverEvent<QueryToUserMapArgs>
): Promise<GQLGetPlansResponse> {
    const mapFilter = event.arguments?.mapFilter ?? {
        boundingBox: [
            [53.3381706, -6.0198985],
            [53.3381706, -6.0198985],
            [53.3381706, -6.0198985],
            [53.3381706, -6.0198985],
        ],
    };
    console.log({
        message: "User map has been invoked",
        userId: event.arguments.userId
    });
    const data = (await axiosPost(
        queries.mapView(event.arguments.start, event.arguments.end, mapFilter),
        {user: event.arguments.userId},
        false
    )).data
    return {
        results: data.result.map(mapResult),
    };
}
