export default {
    business: () => `
    RETURN DOCUMENT(business,@businessId)
    `,
    coliving: () => `
    RETURN DOCUMENT(coliving, @colivingId)
    `,
    getExistingRelations: () => `
    FOR relation IN businessColivingRelation
    FILTER relation._from == @businessId
    RETURN relation._to
    `
};
