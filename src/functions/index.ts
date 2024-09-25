import {generateName} from "../utils";
import {execSync} from "child_process";
import * as aws from "@pulumi/aws";
import * as pulumi from "@pulumi/pulumi";
import * as fs from "fs/promises";
import * as fsSync from "fs";
import * as path from 'path';
import {defaultAssumeRolePolicies, defaultPolicies, SERVICE_PREFIX} from "../buildConstants";
const config = new pulumi.Config();
const FUNCTIONS_DIR = path.join(".", "src", "functions");
const BUILD_ROOT_DIR = path.join(FUNCTIONS_DIR, "dist");

const baseUrl = config.require("url");
const userPoolId = config.require("userPoolId")
const webClientId = config.require("webClientId")
const arangoUsername = config.requireSecret("arango_username")
const arangoPassword = config.requireSecret("arango_password")

async function buildLayer(functionPackage: { includeLayer: boolean, functionName: string }) {
    if (functionPackage.includeLayer) {
        const layerName = `${functionPackage.functionName}Layer`;
        const fullFunctionBuildPath = path.join(BUILD_ROOT_DIR, "layer");
        const layer = new aws.lambda.LayerVersion(layerName, {
            layerName: layerName, // Set the layerName here
            code: new pulumi.asset.FileAsset(`${fullFunctionBuildPath}/layer.zip`),
        });
        return layer.arn;
    }
    return undefined;
}

async function moveFilesIntoCodeSubfolder(folderPath: string) {
    const codeFolderPath = path.join(folderPath, 'code');
    if (!fsSync.existsSync(codeFolderPath)) {
        await fs.mkdir(codeFolderPath);
    }

    const files = await fs.readdir(folderPath);

    for (const file of files) {
        const filePath = path.join(folderPath, file);
        if (fsSync.statSync(filePath).isFile()) {
            const newFilePath = path.join(codeFolderPath, file);
            await fs.rename(filePath, newFilePath);
        }
    }
}

async function copyFolder(source: string, destination: string) {
    if (!fsSync.existsSync(destination)) {
        await fs.mkdir(destination);
    }

    const files = await fs.readdir(source);
    for (const file of files) {
        const sourcePath = path.join(source, file);
        const destinationPath = path.join(destination, file);

        const stats = fsSync.statSync(sourcePath);

        if (stats.isDirectory()) {
            await copyFolder(sourcePath, destinationPath);
        } else {
            await fs.copyFile(sourcePath, destinationPath);
        }
    }
}

const excludeSharedCode = ["libs"];
const functions = fsSync
    .readdirSync(path.join(".", "src", "functions", "handlers"))
    .filter(
        (f: string) =>
            fsSync.lstatSync(path.join(".", "src", "functions", "handlers", f)).isDirectory() &&
            !excludeSharedCode.includes(f)
    );

async function getFunctionConfig(functionName: string): Promise<any> {
    try {
        const configContent = await fs.readFile(path.join(FUNCTIONS_DIR, "handlers", functionName, "config.json"), 'utf-8');
        return JSON.parse(configContent);
    } catch (error) {
        console.log(`Error reading tar: ${error}`);
    }
}

export interface LambdaEndpoint {
    config: any;
    lambda: aws.lambda.Function;
    permRole: aws.iam.Role;
}

export default async function generate() {
    if (fsSync.existsSync(BUILD_ROOT_DIR))
        fsSync.rmSync(BUILD_ROOT_DIR, {recursive: true, force: true});
    execSync(`tsc --project ${path.join("src", "functions", "tsconfig.json")}`);
    execSync(`tsc --project ${path.join("src", "layer", "tsconfig.json")}`);

    const functionPackages = await Promise.all(
        functions.map(async (functionName: string) => {
            let timeout = 3;
            const fullFunctionBuildPath = path.join(BUILD_ROOT_DIR, functionName);
            const functionConfig = await getFunctionConfig(functionName);
            const dependencyBuildCommand = `npm i --prefix ${fullFunctionBuildPath} ${functionConfig.dependencies.join(" ")} --no-bin-links`;

            execSync(dependencyBuildCommand);

            await moveFilesIntoCodeSubfolder(fullFunctionBuildPath);

            if (functionConfig.includeLibs) {
                await copyFolder(path.join(BUILD_ROOT_DIR, 'libs'), path.join(fullFunctionBuildPath, 'libs'));
            }
            if (functionConfig.timeout) {
                timeout = functionConfig.timeout
            }

            return {
                functionName: functionName,
                timeout: timeout,
                ...functionConfig,
            };
        })
    );

    const endpoints = [];
    for (const functionPackage of functionPackages) {
        const permRole = new aws.iam.Role(
            generateName(SERVICE_PREFIX, `${functionPackage.name}-perm`),
            {
                inlinePolicies: defaultPolicies,
                assumeRolePolicy: defaultAssumeRolePolicies,
            }
        );

        const functionPath = path.join(BUILD_ROOT_DIR, functionPackage.functionName);
        const layerArn = await buildLayer(functionPackage);

        const lambda = new aws.lambda.Function(
            generateName(SERVICE_PREFIX, functionPackage.name),
            {
                code: new pulumi.asset.FileArchive(functionPath),
                role: permRole.arn,
                handler: "code/index.handler",
                runtime: "nodejs16.x",
                name: generateName(SERVICE_PREFIX, functionPackage.name),
                environment: {
                    variables: {
                        url: baseUrl,
                        userPool: userPoolId,
                        webClientId: webClientId,
                        arangoUsername: arangoUsername,
                        arangoPassword: arangoPassword
                    }
                },
                layers: layerArn ? [layerArn] : undefined, // Add the layer here
                timeout: functionPackage.timeout
            },
        );
        endpoints.push({
            lambda,
            permRole,
            config: functionPackage,
        });
    }
    return endpoints;
}
