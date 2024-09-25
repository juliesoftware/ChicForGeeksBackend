import {GQLPageInput} from "../../../../schemas";

export interface CursorData {
    date: string;
    offset: number;
    count?: number;
}

export function generatePageResult(total: number, cursor: CursorData) {
    return {
        total,
        pageSize: cursor.count,
        hasNext: (cursor.count ?? 0) + cursor.offset < total,
        nextCursor: generateCursor({
            date: cursor.date,
            offset: (cursor.count ?? 0) + cursor.offset,
        }),
    };
}

export function generateCursor(cursorData: CursorData): string {
    return Buffer.from(`${cursorData.date}|${cursorData.offset}`).toString(
        "base64"
    );
}

export function validateAndPrepareCursorData(page?: GQLPageInput): CursorData {
    let cursor: CursorData = {
        count: 10,
        offset: 0,
        date: new Date().toISOString(),
    };

    if (page?.cursor) {
        const cursorData = getCursorData(page.cursor);
        cursor = { ...cursor, ...cursorData };
        if (page.page) {
            cursor.offset = page.page * (cursor.count ?? 0);
        }
    }

    if (page?.count) {
        cursor.count = page.count;
    }

    return cursor;
}

export function getCursorData(cursor: string): CursorData {
    const parsedCursor = Buffer.from(cursor, "base64").toString("utf-8");
    const cursorParts = parsedCursor.split("|");
    if (cursorParts.length !== 2) throw new Error("invalid cursor");
    if (isNaN(parseInt(cursorParts[1]))) throw new Error("invalid cursor offset");
    if (!(new Date(cursorParts[0]) instanceof Date))
        throw new Error("invalid cursor date");
    return {
        date: cursorParts[0],
        offset: parseInt(cursorParts[1]),
    };
}

export function getRemainingCount(remainingCursor: number, incomingResultLength: number) {
    if (incomingResultLength >= remainingCursor) {
        return 0;
    }
    remainingCursor -= incomingResultLength;
    return remainingCursor;
}