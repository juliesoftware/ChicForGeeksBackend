import axios from "axios";
import {GQLGetPlansResponse, QueryToCountryPlanSearchArgs,} from "../../../../schemas";
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
            id: plan.owner._id,
        },
        location: plan.location,
    };
}

export async function handler(
    event: AppSyncResolverEvent<QueryToCountryPlanSearchArgs>
): Promise<GQLGetPlansResponse> {
    let cursor: CursorData = validateAndPrepareCursorData(event.arguments?.page);
    const query = queries.public(cursor, event.arguments.country);
    const bindVars = {};
    const returnCount = true;

    const response = await axiosPost(query, bindVars, returnCount);

    return {
        results: response.data.result.map(mapResult),
        page: generatePageResult(response.data.extra.stats.fullCount, cursor),
    }
}
