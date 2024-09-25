export default {
    findUsersWithNotificationEnabled: () => `
    FOR u IN user
    FILTER u.expoToken != null
    RETURN u
`
};
