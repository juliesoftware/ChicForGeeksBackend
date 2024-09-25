import {GQLEvent, MutationToAddEventArgs} from "../../../../schemas";
import {AppSyncResolverEvent} from "aws-lambda";
import {axiosSimplePost} from "../libs/axiosRequest";

export async function handler(
    event: AppSyncResolverEvent<MutationToAddEventArgs>
): Promise<GQLEvent> {
    const eventInput = {...event.arguments.eventInput};

    try {
        const response = await axiosSimplePost("document/event", eventInput, true);
        return response.data.new;
    } catch (error) {
        throw new Error(`Failed create event: ${error}`);
    }
}
