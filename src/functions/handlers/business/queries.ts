const queries: Record<string, any> = {
    getMany: () => `
    FOR user IN user
        FILTER user._id == @userId
        FOR v, e IN 1..1 OUTBOUND user userBusinessRelation
            FILTER e._from == user._id
            // Getting the colivings connected to the business
            LET colivingResult = (
                FOR v2, e2 IN 1..1 OUTBOUND v businessColivingRelation
                RETURN v2
            )
            // Getting the coworkings connected to the business
            LET coworkingResult = (
                FOR v3, e3 IN 1..1 OUTBOUND v businessCoworkingRelation
                RETURN v3
            )
            // Structuring the final result
            RETURN {colivings: colivingResult, coworkings: coworkingResult}

  `
};

export default queries;
