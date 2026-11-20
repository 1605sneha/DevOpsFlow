
package DevOpsFlow.service;

import DevOpsFlow.model.PipelineRun;
import DevOpsFlow.repository.PipelineRunRepository;
import org.springframework.stereotype.Service;

import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@Service
public class PipelineRunService {

    private final PipelineRunRepository pipelineRunRepository;
    private final GithubApiService githubApiService;

    public PipelineRunService(
            PipelineRunRepository pipelineRunRepository,
            GithubApiService githubApiService) {

        this.pipelineRunRepository = pipelineRunRepository;
        this.githubApiService = githubApiService;
    }

    // Fetch GitHub workflow runs and save them in PostgreSQL
    public List<PipelineRun> syncPipelineRuns(String owner, String repo) {

        Map response = githubApiService.getWorkflowRuns(owner, repo);

        List<Map<String, Object>> workflowRuns =
                (List<Map<String, Object>>) response.get("workflow_runs");

        List<PipelineRun> savedRuns = new ArrayList<>();

        for (Map<String, Object> run : workflowRuns) {

            Long githubRunId = ((Number) run.get("id")).longValue();

            PipelineRun pipelineRun = pipelineRunRepository
                    .findByGithubRunId(githubRunId)
                    .orElse(new PipelineRun());

            pipelineRun.setGithubRunId(githubRunId);
            pipelineRun.setWorkflowName((String) run.get("name"));
            pipelineRun.setStatus((String) run.get("status"));
            pipelineRun.setConclusion((String) run.get("conclusion"));
            pipelineRun.setBranch((String) run.get("head_branch"));
            pipelineRun.setRunUrl((String) run.get("html_url"));

            String createdAt = (String) run.get("created_at");

            if (createdAt != null) {
                pipelineRun.setCreatedAt(
                        OffsetDateTime.parse(createdAt).toLocalDateTime()
                );
            }

            savedRuns.add(pipelineRunRepository.save(pipelineRun));
        }

        return savedRuns;
    }

    // Retrieve pipeline history stored in PostgreSQL
    public List<PipelineRun> getPipelineHistory() {
        return pipelineRunRepository.findAll();
    }
}
