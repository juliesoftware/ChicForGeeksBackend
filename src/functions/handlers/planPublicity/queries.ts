const queries: Record<string, any> = {
    planPublicity: () => `
    LET total = COUNT(FOR doc IN plan RETURN doc)
    LET privateCount = COUNT(FOR doc IN plan FILTER doc.private == true RETURN doc)
    LET publicCount = COUNT(FOR doc IN plan FILTER doc.private == false RETURN doc)
    RETURN {
        privatePercentage: privateCount / total * 100,
        publicPercentage: publicCount / total * 100
    }
  `
};

export default queries;
