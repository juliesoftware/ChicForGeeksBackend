import {
    GQLColivingResult, GQLGetPaginatedColivingResponse, QueryToColivingsArgs,
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
    event: AppSyncResolverEvent<QueryToColivingsArgs>
): Promise<GQLGetPaginatedColivingResponse> {
    let cursor: CursorData = validateAndPrepareCursorData(event.arguments?.page);
    const searchText = event?.arguments?.searchText ?? null;
    const countryCode = event?.arguments?.countryCode ?? null;
    const city = event?.arguments?.city ?? null;

    console.log({
        message: "Coliving search has been invoked",
        searchText: searchText,
        country: countryCode,
        city: city
    });

    try {
        let query;
        let bindVars;
        if (countryCode || city) {
            if (city && !countryCode) {
                throw new Error("Country is required when city is provided");
            }
            query = queries.locationSearch(cursor, city);
            bindVars = {country: countryCode};
        } else if (searchText) {
            query = queries.fuzzySearch(cursor);
            bindVars = {text: searchText};
        } else {
            query = queries.emptySearch(cursor);
            bindVars = {};
        }

        const returnCount = true;
        const response = await axiosPost(query, bindVars, returnCount);
        return {
            results: response.data.result.map(mapResult),
            page: generatePageResult(response.data.extra.stats.fullCount, cursor),
        }
    } catch (error) {
        throw new Error(`Failed search for colivings: ${error}`);
    }
}
