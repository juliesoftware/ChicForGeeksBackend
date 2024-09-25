import * as pulumi from "@pulumi/pulumi";

const config = new pulumi.Config();
const stage = config.require("stage");

export function generateName(prefix: string, name: string) {
    return `${stage}-${prefix}-${name}`;
}

export function generateNameUnderscore(prefix: string, name: string) {
    return `${stage}_${prefix}_${name}`;
}

export function generateTags(prefix: string, name: string) {
    return {
        STAGE: stage,
        SERVICE: prefix,
        MODULE: name,
    };
}
