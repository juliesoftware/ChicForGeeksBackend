import { AppSyncResolverEvent } from 'aws-lambda';
import {QueryToMapArgs, GQLMapResponse} from "../../../../schemas";
import queries from "./queries";
import {axiosPost} from "../libs/axiosRequest";

export async function handler(
    event: AppSyncResolverEvent<QueryToMapArgs>
): Promise<GQLMapResponse> {
    const {
        requestingUser,
        from,
        to,
        bounds,
        includeFriendPlans = false,
        includeColivings = false,
        includeCoworkings = false,
        includePublicPlans = false
    } = event.arguments;

    function mapResult(result: any): GQLMapResponse {
        return {
            friendPlans: result.friendPlans.map((friendResult: any) => ({
                user: {
                    ...friendResult.user,
                    id: friendResult.user._id
                },
                plan: {
                    ...friendResult.plan,
                    id: friendResult.plan._id,
                    owner: {
                        ...friendResult.plan.owner,
                        id: friendResult.plan.owner._id
                    }
                }
            })),
            publicPlans: result.publicPlans.map((publicResult: any) => ({
                user: {
                    ...publicResult.user,
                    id: publicResult.user._id
                },
                plan: {
                    ...publicResult.plan,
                    id: publicResult.plan._id,
                    owner: {
                        ...publicResult.plan.owner,
                        id: publicResult.plan.owner._id
                    }
                }
            })),
            colivings: result.colivings.map((coliving: any) => ({
                ...coliving,
                id: coliving._id
            })),
            coworkings: result.coworkings.map((coworking: any) => ({
                ...coworking,
                id: coworking._id
            }))
        };
    }

    // Make sure to replace the 'bounds' input with the appropriate GeoJSON Polygon format
    const convertedBounds = {
        type: "Polygon",
        coordinates: [bounds]
    };

    const query = queries.queryString();
    const bindVars = {
        requestingUser,
        from,
        to,
        bounds: convertedBounds,
        includeFriendPlans,
        includePublicPlans,
        includeColivings,
        includeCoworkings
    };
    const returnCount = false;

    try {
        const response = await axiosPost(query, bindVars, returnCount)
        const result = response.data.result[0];
        return mapResult(result);
    } catch (err) {
        console.error(err);
        console.log("Bounds: " + bounds)
        return {friendPlans: [], publicPlans: [], colivings: [], coworkings: []}
    }
}