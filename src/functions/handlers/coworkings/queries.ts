import {CursorData} from "../libs/cursor";
import queryFragments from "../libs/queryFragments";

const queries: Record<string, any> = {
    locationSearch: (cursor: CursorData, city: string | null) => `
    FOR doc IN coworking
      FILTER doc.state != "HIDDEN"
      FILTER doc.location.country == @country
      ${cityFilter(city)}
      SORT doc.state == "VERIFIED" desc
      ${queryFragments.pagination(cursor)}
    RETURN doc
  `,
    fuzzySearch: (cursor: CursorData) => `
    FOR doc IN coworking
      FILTER doc.state != "HIDDEN"
      FILTER LIKE(LOWER(doc.name), CONCAT('%', LOWER(@text), '%')) 
      OR LIKE(LOWER(doc.location.fullAddress), CONCAT('%', LOWER(@text), '%'))
      SORT doc.state == "VERIFIED" desc
      ${queryFragments.pagination(cursor)}
    RETURN doc
  `,
    emptySearch: (cursor: CursorData) => `
    FOR doc in coworking
        FILTER doc.state != "HIDDEN"
        SORT RAND()
        ${queryFragments.pagination(cursor)}
    RETURN doc
  `
};

function cityFilter(city: string | null) {
    if (city != null) {
        return `AND doc.location.city == "${city}"`
    } else {
        return ``
    }
}

export default queries;
