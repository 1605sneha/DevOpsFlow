
package DevOpsFlow.controller;

import DevOpsFlow.service.GithubApiService;
import DevOpsFlow.service.PipelineRunService;
import DevOpsFlow.model.PipelineRun;

import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/pipeline")
@CrossOrigin(origins = "*")
public class PipelineController {

    private final GithubApiService githubApiService;
    private final PipelineRunService pipelineRunService;

    public PipelineController(
            GithubApiService githubApiService,
            PipelineRunService pipelineRunService) {

        this.githubApiService = githubApiService;
        this.pipelineRunService = pipelineRunService;
    }

    // Trigger GitHub Actions pipeline
    @PostMapping("/trigger/{owner}/{repo}")
    public String triggerPipeline(
            @PathVariable String owner,
            @PathVariable String repo,
            @RequestParam(
                    defaultValue = "development")
            String environment) {

        githubApiService.triggerWorkflow(
                owner,
                repo,
                environment);

        return "GitHub Actions pipeline triggered successfully for "
                + environment + " environment!";
    }

    // Fetch live workflow runs from GitHub
    @GetMapping("/runs/{owner}/{repo}")
    public Map getPipelineRuns(
            @PathVariable String owner,
            @PathVariable String repo) {

        return githubApiService.getWorkflowRuns(owner, repo);
    }

    // Synchronize GitHub workflow runs with PostgreSQL
    @PostMapping("/sync/{owner}/{repo}")
    public List<PipelineRun> syncPipelineRuns(
            @PathVariable String owner,
            @PathVariable String repo) {

        return pipelineRunService.syncPipelineRuns(
                owner,
                repo);
    }

    // Retrieve saved pipeline history from PostgreSQL
    @GetMapping("/history")
    public List<PipelineRun> getPipelineHistory() {

        return pipelineRunService.getPipelineHistory();
    }

    // Retrieve details of a specific workflow run
    @GetMapping("/details/{owner}/{repo}/{runId}")
    public Map getPipelineRunDetails(
            @PathVariable String owner,
            @PathVariable String repo,
            @PathVariable Long runId) {

        return githubApiService.getWorkflowRunDetails(
                owner,
                repo,
                runId);
    }
}
