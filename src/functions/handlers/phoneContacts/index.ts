import {GQLGetUsersResponse, GQLPhoneSearchResult, QueryToPhoneContactsArgs,} from "../../../../schemas";
import {AppSyncResolverEvent} from "aws-lambda";
import queries from "./queries";
import {axiosPost} from "../libs/axiosRequest";

function mapResult(searchResult: any): GQLPhoneSearchResult {
    return {
        ...searchResult.user,
        id: searchResult?.user?._id,
        phoneNumber: searchResult.phoneNumber,
        friendshipStatus: searchResult.friendshipStatus,
    };
}

export async function handler(
    event: AppSyncResolverEvent<QueryToPhoneContactsArgs>
): Promise<GQLGetUsersResponse> {
    const phoneNumbers = event.arguments.phoneNumbers;
    const phoneStrings = phoneNumbers.map(phone => `${phone.countryCode}-${phone.digits}`);
    const phoneList = phoneStrings.join(', ');

    console.log({
        message: "Phone contact search has been invoked",
        userId: event.arguments.userId,
        phoneNumbers: phoneList
    });

    try {
        const response = await axiosPost(queries.all(), {
            callingUserId: event.arguments.userId,
            phoneNumbers: event.arguments.phoneNumbers
        }, false)

        return {results: response.data.result[0].map(mapResult)}
    } catch (error) {
        throw new Error("Failed search phoneNumbers: " + error);
    }
}
