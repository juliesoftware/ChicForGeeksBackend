import queryFragments from "../libs/queryFragments";
import {GQLMapSearch} from "../../../../schemas";

export default {
    mapView: (mapFilter: GQLMapSearch) => `
  FOR v, e, p IN ANY DOCUMENT(user,@user) friendship
    OPTIONS { order: 'bfs', uniqueVertices:'global', edgeCollections:['friendship'], vertexCollections:['user'] }
    FILTER (
      IS_SAME_COLLECTION(p.edges[0],"friendship") && p.edges[0].requested != true && p.edges[0].blocked != true
    )
      && IS_SAME_COLLECTION(v,'user')
    LET loc = FIRST(FOR lq, lqe IN INBOUND v attached RETURN lq)
    FILTER IS_IN_POLYGON(${JSON.stringify(mapFilter.boundingBox)}, TO_NUMBER(loc.lat), TO_NUMBER(loc.lng)
)
    RETURN ${queryFragments.userReturn("v")}
`,
};
