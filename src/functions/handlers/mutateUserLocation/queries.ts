const queries: Record<string, any> = {
    mapView: (latitude: number = 0, longitude: number = 0) => `
    FOR v, e, p IN ANY DOCUMENT(user, @user) friendship
        OPTIONS { order: 'bfs', uniqueVertices: 'global', edgeCollections: ['friendship'], vertexCollections: ['user'] }
        FILTER (
            IS_SAME_COLLECTION(p.edges[0], "friendship") &&
            p.edges[0].requested != true &&
            p.edges[0].blocked != true
        )
        && IS_SAME_COLLECTION(v, 'user')
        FILTER IS_IN_POLYGON(
            [
                [${latitude - 0.5}, ${longitude - 0.5}],
                [${latitude - 0.5}, ${longitude + 0.5}], 
                [${latitude + 0.5}, ${longitude + 0.5}], 
                [${latitude + 0.5}, ${longitude - 0.5}]
            ],
            TO_NUMBER(v.location.lat), TO_NUMBER(v.location.lng)
        )
    RETURN v._id
`,
    findNotifications: () => `
  return COUNT (FOR v, e IN INBOUND document(user, @user) notified
  Filter e.seen == false
  RETURN e)
  `,
    updateLocationOnUser: () => `
    LET user = DOCUMENT(@userId)
    UPDATE user WITH {
        location: {
            lat: @latitude,
            lng: @longitude
        }
    } IN user
    RETURN NEW
  `,
    getNotifiableUsers: () => `
    LET userIds = @userIds
    LET specifiedDate = @date
    
    FOR userId IN userIds
        LET notifications = (
            FOR v, e, p IN INBOUND DOCUMENT(user, userId) notified
            FILTER e.notificationType == 'NEARBY_FRIEND' && e.created_at > specifiedDate
            RETURN e
        )
        FILTER LENGTH(notifications[0]) == 0
        RETURN DOCUMENT(user, userId)
  `
};

export default queries;
