import {GQLNotificationType, GQLPlan, MutationToAddPlanArgs} from "../../../../schemas";
import {AppSyncResolverEvent} from "aws-lambda";
import queries from "./queries";
import {axiosDelete, axiosPatch, axiosPost, axiosSimplePost} from "../libs/axiosRequest";

const {Expo} = require('expo-server-sdk')
const expo = new Expo();

async function deleteNoMorePlansNotification(userId: string) {
    const query = `
        FOR n IN notified
            FILTER n._from == @userId AND n.notificationType == "NO_MORE_PLANS"
            REMOVE n IN notified
    `;

    const bindVars = {
        userId: userId
    };

    return await axiosPost(query, bindVars, false);  // Adjust based on your axiosRequest setup
}


async function handleDeletePlan(
  event: AppSyncResolverEvent<MutationToAddPlanArgs>,
  owner: string,
  requestingUser: any,
  planResponse: any,
  messages: any[]
) {
  const join = (
    await axiosPost(
      queries.findJoined(
        event.arguments.planInput.owner
          ? event.arguments.planInput.owner
          : event.arguments.userId
      ),
      { plan: event.arguments.planInput.id },
      false
    )
  ).data;

  for (let j of join.result) {
    await axiosDelete(`document/join/${j.join._key}`);
    if (j.join._from != owner) {
      const notificationJson = {
        _from: event.arguments.planInput.id,
        _to: j.join._from,
        notificationType: GQLNotificationType.PLAN_DELETED,
        text: `${requestingUser.result[0].name} cancelled the plan ${planResponse.result[0].plan.name}`,
        created_at: new Date().toISOString(),
        deletedName: planResponse.result[0].plan.name,
        related: event.arguments.userId,
        seen: false,
        image: requestingUser.result[0].image,
        deepLink: requestingUser.result[0]._id,
      };
      await axiosSimplePost("document/notified", notificationJson);

      if (j.user.expoToken) {
        let message = {
          to: j.user.expoToken,
          title: "Deleted plan",
          body: planResponse.result[0].plan.name
            ? planResponse.result[0].plan.name
            : planResponse.result[0].plan.location.displayName,
          data: { link: `nomadago://user/${j.user.username}` },
        };
        messages.push(message);
      }
    }
  }
  await axiosDelete(`document/plan/${planResponse.result[0].plan._key}`);
}

export async function handler(
    event: AppSyncResolverEvent<MutationToAddPlanArgs>
): Promise<GQLPlan> {
    let messages: any[] = [];
    let planId;
    const requestingUser = (await axiosPost(queries.user(), {user: event.arguments.userId}, false)).data
    let owner = event.arguments.planInput.owner ? event.arguments.planInput.owner : event.arguments.userId;

    const planJson: any = {
        name: event.arguments.planInput.name,
        start: event.arguments.planInput.start,
        end: event.arguments.planInput.end,
        private: event.arguments.planInput.private,
        owner: event.arguments.planInput.owner ? event.arguments.planInput.owner : event.arguments.userId,
        description: event.arguments.planInput.description,
        status: event.arguments.planInput.status,
        updated_at: new Date().toISOString(),
        location: event.arguments.planInput.location,
        activities: event.arguments.planInput.activities
    }
    const planExists = event.arguments.planInput.id != null;

    if (planExists) {
        planId = event.arguments.planInput.id;
        planJson.created_at = new Date().toISOString();
        const planResponse = (await axiosPost(queries.single(), {plan: event.arguments.planInput.id}, false)).data
        await deleteNoMorePlansNotification(event.arguments.userId)


        if (event.arguments.delete) {
          await handleDeletePlan(event, owner, requestingUser, planResponse, messages);
        } else {
            await axiosPatch(`document/plan/${planResponse.result[0].plan._key}`, planJson)
            await axiosPatch(`document/location/${planResponse.result[0].location._key}`, event.arguments.planInput.location)
        }
    } else {
        const planResponse = (await axiosSimplePost("document/plan", planJson)).data
        planId = planResponse._id;

        if (event.arguments.usersToAdd && event.arguments.usersToAdd.length > 0) {
            await axiosPost(queries.inviteUsers(), {
                userIds: event.arguments.usersToAdd,
                planId: planId
            }, false)

            for (const userToAdd of event.arguments.usersToAdd) {
                const notifUser = (await axiosPost(queries.user(), {user: userToAdd}, false)).data

                if (notifUser && notifUser.result.length > 0 && notifUser.result[0].expoToken) {
                    let badge = 0;
                    const countNotif = (await axiosPost(queries.findNotifications(), {user: notifUser.result[0]._id}, false)).data
                    if (countNotif.result && countNotif.result.length > 0) {
                        badge = countNotif.result[0];
                    }
                    let message = {
                        to: notifUser.result[0].expoToken,
                        title: `Plan invitation from ${requestingUser.result[0].name}`,
                        body: planJson.name ? planJson.name : planJson.location.displayName,
                        data: {link: `nomadago://${planId}`},
                        badge: badge + 1,
                    }
                    messages.push(message);
                }

                const planDisplayName = planJson.name ? planJson.name : planJson.location.displayName;

                const notificationJson = {
                    _from: planId,
                    _to: notifUser.result[0]._id,
                    related: event.arguments.userId,
                    notificationType: GQLNotificationType.PLAN_INVITE,
                    text: `${requestingUser.result[0].name} invited you to ${planDisplayName}`,
                    created_at: new Date().toISOString(),
                    image: requestingUser.result[0].image,
                    deepLink: planId,
                    seen: false
                }
                await axiosSimplePost("document/notified", notificationJson)
            }
        }

        await deleteNoMorePlansNotification(event.arguments.userId)
        const dataLoc = (await axiosSimplePost("document/location", event.arguments.planInput.location)).data

        const receivedDateString = event.arguments?.planInput?.start;
        const currentDate = new Date();
        const hasHappend = receivedDateString != null ? new Date(receivedDateString) <= currentDate : false;

        if (hasHappend
        && event.arguments.planInput?.location?.country != null) {
            await axiosPost(queries.addVisitedCountry(), {
                userId: event.arguments.userId,
                countryToAdd: event.arguments.planInput.location.country
            }, false)
        }

        const joinJson = {
            _from: event.arguments.userId,
            _to: planResponse._id,
            owner: true
        }

        const attachJson = {
            _from: dataLoc._id,
            _to: planResponse._id
        }

        await axiosSimplePost("document/join", joinJson)
        await axiosSimplePost("document/attached", attachJson)

        const notifUser = (await axiosPost(queries.user(), {user: event.arguments.planInput.owner ? event.arguments.planInput.owner : event.arguments.userId}, false)).data

        const overLap = (await axiosPost(
            queries.findOverlapped(event.arguments.planInput.location?.lat, event.arguments.planInput.location?.lng, event.arguments.planInput.start, event.arguments.planInput.end),
            {user: event.arguments.planInput.owner ? event.arguments.planInput.owner : event.arguments.userId},
            false
        )).data

        for (const overlap of overLap.result) {
            const notificationJson = {
                _from: planId,
                _to: overlap.user._id,
                notificationType: GQLNotificationType.FUTURE_PLAN_OVERLAP,
                text: `You're going to overlap with ${requestingUser.result[0].name} in ${overlap.plan.location.displayName}`,
                created_at: new Date().toISOString(),
                seen: false,
                image: requestingUser.result[0].image,
                deepLink: planId,
                related: event.arguments.userId,
                other: planId
            }
            await axiosSimplePost("document/notified", notificationJson)

            if (overlap.user.expoToken) {
                let badge = 0;
                const countNotif = (await axiosPost(queries.findNotifications(), {user: overlap.user._id}, false)).data
                if (countNotif.result && countNotif.result.length > 0) {
                    badge = countNotif.result[0];
                }
                let message = {
                    to: overlap.user.expoToken,
                    title: 'Overlapping plan',
                    body: `You're going to overlap with ${requestingUser.result[0].name} in ${overlap.plan.location.displayName}`,
                    data: {link: `nomadago://user/${event.arguments.userId}`},
                    badge: badge + 1,
                }
                messages.push(message);
            }

            const secondNotificationJson = {
                _from: overlap.plan._id,
                _to: event.arguments.userId,
                notificationType: GQLNotificationType.FUTURE_PLAN_OVERLAP,
                text: `You're going to overlap with ${overlap.user.name} in ${planJson.location.displayName}`,
                created_at: new Date().toISOString(),
                seen: false,
                image: overlap.user.image,
                deepLink: overlap.plan._id,
                related: overlap.user._id,
                other: overlap.plan._id
            }
            await axiosSimplePost("document/notified", secondNotificationJson)

            if (notifUser && notifUser.result.length > 0 && notifUser.result[0].expoToken) {
                let badge = 0;
                const countNotif = (await axiosPost(queries.findNotifications(), {user: notifUser.result[0]._id}, false)).data
                if (countNotif.result && countNotif.result.length > 0) {
                    badge = countNotif.result[0];
                }
                let message = {
                    to: notifUser.result[0].expoToken,
                    title: 'Overlapping plan',
                    body: `You're going to overlap with ${overlap.user.name} in ${planJson.location.displayName}`,
                    data: {link: `nomadago://${planId}`},
                    badge: badge + 1,
                }
                messages.push(message);
            }
        }
    }

    const chunks = expo.chunkPushNotifications(messages)
    for (let chunk of chunks) {
        try {
            await expo.sendPushNotificationsAsync(chunk);
        } catch (error) {
            console.error(error);
        }
    }

    return {
        id: planId,
        name: event.arguments.planInput.name,
        start: event.arguments.planInput.start,
        end: event.arguments.planInput.end,
    };
}
