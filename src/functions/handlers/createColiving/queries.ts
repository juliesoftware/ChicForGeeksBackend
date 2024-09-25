export default {
    userCanEditColiving: () => `
        FOR user IN user
        FILTER user._id == @userId
        FOR v, e IN 1..1 OUTBOUND user userBusinessRelation
        FILTER e._from == user._id
        FOR v2, e2 IN 1..1 OUTBOUND v businessColivingRelation
        FILTER e2._to == @colivingId
        RETURN e2._to
        `,
    getBusinessDetails: () => `
        FOR user IN user
        FILTER user._id == @userId
        FOR v, e IN 1..1 OUTBOUND user userBusinessRelation
        RETURN v
        `,
    connectBusinessToColiving: () => `
    INSERT {
        _from: @businessId,
        _to: @colivingId
    } INTO businessColivingRelation
    `
};
