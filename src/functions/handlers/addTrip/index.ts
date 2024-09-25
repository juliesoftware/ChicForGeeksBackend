import {GQLTrip, MutationToAddTripArgs} from "../../../../schemas";
import {AppSyncResolverEvent} from "aws-lambda";
import {axiosSimplePost} from "../libs/axiosRequest";

export async function handler(
    event: AppSyncResolverEvent<MutationToAddTripArgs>
): Promise<GQLTrip> {
    const tripInput = {...event.arguments.tripInput};

    try {
        const response = await axiosSimplePost("document/trip", tripInput, true);
        return response.data.new;
    } catch (error) {
        throw new Error(`Failed create trip: ${error}`);
    }
}
