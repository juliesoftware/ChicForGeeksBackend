import queryFragments from "../libs/queryFragments";
import {GQLMapSearch} from "../../../../schemas";

export default {
    mapView: (start: string = "", end: string = "", mapFilter: GQLMapSearch) => `
  FOR v, e, p IN 1..2 OUTBOUND DOCUMENT(user,@user) join, ANY friendship
    OPTIONS { order: 'bfs', uniqueVertices:'global', edgeCollections:['join','friendship'], vertexCollections:['plan','user'] }
    FILTER IS_SAME_COLLECTION(v,'plan') &&
     (
      (IS_SAME_COLLECTION(p.edges[0],'join') && p.edges[0].joinStatus != 'REQUESTED' && p.edges[0].joinStatus != 'INVITED')||
      (IS_SAME_COLLECTION(p.edges[0],"friendship") && p.edges[0].requested != true && p.edges[0].blocked != true &&
       IS_SAME_COLLECTION(p.edges[1], "join") && p.edges[1].owner == true)
    )
    LET loc = FIRST(FOR lq, lqe IN INBOUND v attached RETURN lq)
    FILTER IS_IN_POLYGON(${JSON.stringify(mapFilter.boundingBox)}, TO_NUMBER(loc.lat), TO_NUMBER(loc.lng)
) ${end || start ? " && " : ""}
 ${end ? `v.start < '${end}' ${start ? "&&" : ""}` : ""}
 ${start ? `v.end > '${start}' ` : ""}
    RETURN ${queryFragments.planReturn("v")}
`,
};
