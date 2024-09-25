import axios from 'axios';

const arangoAuth = {
    username: process.env.arangoUsername ?? '',
    password: process.env.arangoPassword ?? ''
};

const baseUrl: string = process.env.url ?? '';

const api = axios.create({
    baseURL: baseUrl,
    auth: arangoAuth
});

export async function axiosPost(query: any, bindVars: any, returnCount: boolean, returnNew?: any) {
    return api.post('cursor', {
        query,
        bindVars,
        options: {
            fullCount: returnCount,
        }
    }, { params: {
            returnNew: returnNew
        }
    });
}

export async function axiosBatchPost(query: any, bindVars: any, returnCount: boolean, batchSize: number, returnNew?: any) {
    return api.post('cursor', {
        query,
        bindVars,
        batchSize: batchSize,
        options: {
            fullCount: returnCount,
            batchSize: batchSize
        }
    }, { params: {
        returnNew: returnNew
    }
    });
}

export async function axiosInsert(url: string, documentToInsert: any, returnNew?: any) {
    return api.post(url, documentToInsert, { params: {
            returnNew: returnNew
        }
    });
}

export async function axiosPatch(url: string, documentToUpdate: any, returnNew?: boolean) {
    return api.patch(url, documentToUpdate, {
        params: {
            returnNew: returnNew
        }
    });
}


export async function axiosDelete(url: string, returnNew?: any) {
    return api.delete(url, { params: {
            returnNew: returnNew
        }
    });
}

export async function axiosPut(url: string, document: any, returnNew?: any) {
    return api.put(url, document, { params: {
            returnNew: returnNew
        }
    });
}

export async function axiosSimplePost(url: string, documentToUpdate: any, returnNew?: any) {
    return api.post(url, documentToUpdate, { params: {
            returnNew: returnNew
        }
    });
}

export async function axiosGet(url: string) {
    return api.post(url);
}
