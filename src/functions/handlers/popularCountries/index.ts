import {
    GQLColivingResult,
    GQLGetPopularCountriesResponse,
    QueryToPopularCountriesArgs,
} from "../../../../schemas";
import {AppSyncResolverEvent} from "aws-lambda";
import queries from "./queries";
import {CursorData, validateAndPrepareCursorData} from "../libs/cursor";
import axios from "axios";

function mapResult(searchResult: any): GQLColivingResult {
    return {
        ...searchResult,
        id: searchResult._id
    };
}

async function axiosBonusPost(cursor: any) {
    const url: string = process.env.url ?? '';
    const arangoAuth = {
        username: process.env.arangoUsername ?? '',
        password: process.env.arangoPassword ?? ''
    };

    return axios.post(url + "cursor", {
        query: queries.countrySearch(cursor),
        bindVars: {},
        options: {
            fullCount: true,
        }
    }, { auth: arangoAuth })
}

export async function handler(
    event: AppSyncResolverEvent<QueryToPopularCountriesArgs>
): Promise<GQLGetPopularCountriesResponse> {
    let cursor: CursorData = validateAndPrepareCursorData(event.arguments?.page);

    console.log({
        message: "Popular country search has been invoked"
    });

    try {
        const response = await axiosBonusPost(cursor)
        return {results: response.data.result.map(mapResult)}
    } catch (error) {
        throw new Error("Failed search for popular countries: " + error);
    }
}
