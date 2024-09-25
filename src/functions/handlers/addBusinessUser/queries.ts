export default {
    addUserBusinessRelation: () => `
    INSERT { _from: @userId, _to: @businessId } INTO userBusinessRelation
    `
};
