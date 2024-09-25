import {
    GQLColivingResult, GQLGetPaginatedColivingResponse, QueryToColivingsDistanceArgs,
} from "../../../../schemas";
import {AppSyncResolverEvent} from "aws-lambda";
import queries from "./queries";
import {CursorData, generatePageResult, validateAndPrepareCursorData} from "../libs/cursor";
import {axiosPost} from "../libs/axiosRequest";

function mapResult(searchResult: any): GQLColivingResult {
    return {
        ...searchResult,
        id: searchResult._id
    };
}

export async function handler(
    event: AppSyncResolverEvent<QueryToColivingsDistanceArgs>
): Promise<GQLGetPaginatedColivingResponse> {
    let cursor: CursorData = validateAndPrepareCursorData(event.arguments?.page);

    const distance = event.arguments.distance ? event.arguments.distance * 1000 : 50000;
    console.log({
        message: "Coliving distance search has been invoked",
        lat: event.arguments.lat,
        lng: event.arguments.lng,
        distance: distance
    });

    const query = queries.distanceSearch(cursor);
    const bindVars = {
        lat: event.arguments.lat,
        lng: event.arguments.lng,
        distance: distance
    };
    const returnCount = true;

    try {
        const response = await axiosPost(query, bindVars, returnCount);
        return {
            results: response.data.result.map(mapResult),
            page: generatePageResult(response.data.extra.stats.fullCount, cursor),
        }
    } catch (error) {
        throw new Error("Failed search for colivings: " + error);
    }
}
