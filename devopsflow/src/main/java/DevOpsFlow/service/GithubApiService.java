
package DevOpsFlow.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientResponseException;
import org.springframework.web.server.ResponseStatusException;

import java.util.Map;
import java.util.Set;

@Service
public class GithubApiService {

    private final RestClient restClient;

    private static final String WORKFLOW_FILE = "ci.yml";

    private static final Set<String> ALLOWED_ENVIRONMENTS =
            Set.of("development", "testing", "production");

    public GithubApiService(
            @Value("${github.token}") String githubToken) {

        this.restClient = RestClient.builder()
                .baseUrl("https://api.github.com")
                .defaultHeader(
                        "Accept",
                        "application/vnd.github+json")
                .defaultHeader(
                        "Authorization",
                        "Bearer " + githubToken)
                .defaultHeader(
                        "X-GitHub-Api-Version",
                        "2022-11-28")
                .build();
    }

    // Retrieve repository information
    public Map getRepository(String owner, String repo) {

        return restClient.get()
                .uri("/repos/{owner}/{repo}", owner, repo)
                .retrieve()
                .body(Map.class);
    }

    // Trigger workflow using Development by default
    public void triggerWorkflow(String owner, String repo) {

        triggerWorkflow(owner, repo, "development");
    }

    // Trigger workflow with selected environment
    public void triggerWorkflow(
            String owner,
            String repo,
            String environment) {

        if (environment == null ||
                !ALLOWED_ENVIRONMENTS.contains(
                        environment.toLowerCase())) {

            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Invalid deployment environment");
        }

        Map<String, Object> requestBody = Map.of(
                "ref", "main",
                "inputs", Map.of(
                        "environment",
                        environment.toLowerCase()
                )
        );

        try {

            restClient.post()
                    .uri(
                            "/repos/{owner}/{repo}/actions/workflows/{workflow}/dispatches",
                            owner,
                            repo,
                            WORKFLOW_FILE)
                    .body(requestBody)
                    .retrieve()
                    .toBodilessEntity();

        } catch (RestClientResponseException exception) {

            throw new ResponseStatusException(
                    HttpStatus.BAD_GATEWAY,
                    "GitHub workflow dispatch failed. GitHub response: "
                            + exception.getResponseBodyAsString(),
                    exception);
        }
    }

    // Fetch recent pipeline executions
    public Map getWorkflowRuns(String owner, String repo) {

        return restClient.get()
                .uri(
                        "/repos/{owner}/{repo}/actions/runs?per_page=10",
                        owner,
                        repo)
                .retrieve()
                .body(Map.class);
    }

    // Retrieve details of one specific workflow run
    public Map getWorkflowRunDetails(
            String owner,
            String repo,
            Long runId) {

        return restClient.get()
                .uri(
                        "/repos/{owner}/{repo}/actions/runs/{runId}",
                        owner,
                        repo,
                        runId)
                .retrieve()
                .body(Map.class);
    }
}
