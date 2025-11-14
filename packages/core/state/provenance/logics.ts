import { createLogic } from "redux-logic";

import {
    CONSTRUCT_PROVENANCE_GRAPH,
    ConstructProvenanceGraph,
    setGraphEdges,
    setGraphNodes,
} from "./actions";
import { ReduxLogicDeps, selection } from "../";
import interaction from "../interaction";
import GraphGenerator from "../../entity/GraphGenerator";

/**
 * Interceptor responsible for responding to CONSTRUCT_PROVENANCE_GRAPH actions
 * by processing edge definitions into nodes & edges that are stored in state
 */
const constructProvenanceLogic = createLogic({
    async process(deps: ReduxLogicDeps, dispatch, done) {
        const { payload: file } = deps.action as ConstructProvenanceGraph;

        const fileService = interaction.selectors.getFileService(deps.getState());
        const { databaseService } = interaction.selectors.getPlatformDependentServices(
            deps.getState()
        );
        const selectedDataSources = selection.selectors.getSelectedDataSources(deps.getState());

        const edgeDefinitions = await databaseService.fetchProvenanceDefinitions(
            selectedDataSources.map((source) => source.name)
        );

        const graphGenerator = new GraphGenerator(fileService, edgeDefinitions);
        const graph = await graphGenerator.generate(file);

        dispatch(setGraphEdges(Object.values(graph.edgeMap)));
        dispatch(setGraphNodes(Object.values(graph.nodeMap)));
        done();
    },
    type: CONSTRUCT_PROVENANCE_GRAPH,
});

export default [constructProvenanceLogic];
