import queries from "./queries";
import {axiosPost} from "../libs/axiosRequest";

const {Expo} = require('expo-server-sdk')
const expo = new Expo();

async function sendNotifications(usersWithPlanEndingSoon: any, usersWithoutPlans: any): Promise<void> {
    let messages = [];
    for (let item of usersWithoutPlans) {
        let user = item.user;

        // Constructing the notification message
        let message = {
            to: user.expoToken,
            title: 'Time for New Adventures!',
            body: `Hey ${user.name}, we noticed you don't have any upcoming plans. Why not start planning your next adventure now?`,
            data: { link: `nomadago://addPlan` },
        };
        messages.push(message);
    }

    for (let item of usersWithPlanEndingSoon) {
        let user = item.user;
        let plan = item.plan;

        // Constructing the notification message
        let planName = plan.name ? plan.name : plan.location.displayName;
        let message = {
            to: user.expoToken,
            title: 'Plan Reminder',
            body: `Your plan "${planName}" in ${plan.location.city} is ending soon! Consider adding another plan.`,
            data: { link: `nomadago://addPlan` },
        };
        messages.push(message);
    }

    // Send the notifications
    const chunks = expo.chunkPushNotifications(messages);
    for (let chunk of chunks) {
        try {
            let ticketChunk = await expo.sendPushNotificationsAsync(chunk);
            console.log(ticketChunk);
        } catch (error) {
            console.error(error);
        }
    }
}

export async function handler(): Promise<any> {
    // Fetch users to notify
    const usersWithExpiringPlans = (await axiosPost(queries.findUsersWithExpiringPlan(), {}, false)).data.result
    const usersWithoutPlans = (await axiosPost(queries.findUsersWithoutPlan(), {}, false)).data.result

    //Notify
    await sendNotifications(usersWithExpiringPlans, usersWithoutPlans)

    // Update the "notified" collection
    for (const record of usersWithExpiringPlans) {
        // After sending the notification, add a document to the "notified" collection
        await axiosPost(queries.insertPlanReminderNotification(),
            {userId: record.user._id},
            false)
    }

    for (const record of usersWithoutPlans) {
        // After sending the notification, add a document to the "notified" collection
        await axiosPost(queries.insertNoPlansNotification(),
            {userId: record.user._id},
            false)
    }

    return {
        statusCode: 200,
        body: JSON.stringify({ message: 'Notifications sent' }),
    };
}
