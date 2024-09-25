const queries: Record<string, any> = {
    friendCount: () => `
    LET totalUsers = COUNT(FOR user IN user RETURN user)
    LET usersWith15OrMoreFriends = (
        FOR user IN user
            FILTER (
                LENGTH(FOR friendship IN friendship FILTER (friendship._from == user._id || friendship._to == user._id) && friendship.requested != true RETURN friendship) >= 15
            )
            RETURN user
    )
    RETURN {
        numberOfUsersWith15OrMoreFriends: LENGTH(usersWith15OrMoreFriends),
        percentageOfUsersWith15OrMoreFriends: LENGTH(usersWith15OrMoreFriends) / totalUsers * 100
    }
  `
};

export default queries;
