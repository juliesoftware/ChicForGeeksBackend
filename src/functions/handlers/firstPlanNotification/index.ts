import queries from "./queries";
import {axiosPost} from "../libs/axiosRequest";

const {Expo} = require('expo-server-sdk')
const expo = new Expo();

async function sendNotifications(usersWithoutPlans: any): Promise<void> {
    let messages = [];
    for (let user of usersWithoutPlans) {
        
        // Constructing the notification message
        let message = {
            to: user.expoToken,
            title: 'Get Started with Your First Plan!',
            body: `Hey ${user.name}, looks like you haven't created any plans yet. Dive in and start planning your first adventure on Nomadago!`,
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
    const usersToNotify = (await axiosPost(queries.findUsersToNotify(), {}, false)).data.result

    //Notify
    await sendNotifications(usersToNotify)

    // Update the "notified" collection
    for (const user of usersToNotify) {
        // After sending the notification, add a document to the "notified" collection
        await axiosPost(queries.insertFirstPlanNotification(),
            {user: user._id},
            false)
    }

    return {
        statusCode: 200,
        body: JSON.stringify({ message: 'Notifications sent' }),
    };
}
