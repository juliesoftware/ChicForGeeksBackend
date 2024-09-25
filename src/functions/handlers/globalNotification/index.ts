import queries from "./queries";
import {axiosBatchPost, axiosPost} from "../libs/axiosRequest";

const {Expo} = require('expo-server-sdk')
const expo = new Expo();

async function sendNotifications(usersWithNotificationsEnabled: any): Promise<void> {
    let messages = [];
    for (let user of usersWithNotificationsEnabled) {

        // Constructing the notification message
        let message = {
            to: user.expoToken,
            title: 'Our Turkey Trip is half filled!? 👀🇹🇷',
            body: `Spots have been booking up quickly for our coliving trip to the Turkish coast in May.  Do you want in?`,
            data: { link: `nomadago://plan/13088479` },
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
    const usersWithNotificationsEnabled = (await axiosBatchPost(queries.findUsersWithNotificationEnabled(), {}, false, 5000)).data.result

    //Notify
    await sendNotifications(usersWithNotificationsEnabled)

    return {
        statusCode: 200,
        body: JSON.stringify({ message: 'Notifications sent' }),
    };
}
