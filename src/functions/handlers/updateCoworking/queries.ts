export default {
    userCanEditCoworking: () => `
        FOR user IN user
        FILTER user._id == @userId
        FOR v, e IN 1..1 OUTBOUND user userBusinessRelation
        FILTER e._from == user._id
        FOR v2, e2 IN 1..1 OUTBOUND v businessCoworkingRelation
        FILTER e2._to == @coworkingId
        RETURN e2._to
        `
};
