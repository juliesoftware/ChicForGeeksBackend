export default {
    business: () => `
    RETURN DOCUMENT(business,@businessId)
    `,
    coworking: () => `
    RETURN DOCUMENT(coworking, @coworkingId)
    `,
    getExistingRelations: () => `
    FOR relation IN businessCoworkingRelation
    FILTER relation._from == @businessId
    RETURN relation._to
    `
};
