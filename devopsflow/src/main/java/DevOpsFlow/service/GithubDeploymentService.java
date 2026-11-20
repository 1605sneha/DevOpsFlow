
package DevOpsFlow.service;

import DevOpsFlow.model.GithubDeployment;
import DevOpsFlow.repository.GithubDeploymentRepository;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

import java.time.Instant;
import java.util.List;
import java.util.Map;

@Service
public class GithubDeploymentService {

    private final GithubDeploymentRepository deploymentRepository;
    private final RestClient restClient;

    public GithubDeploymentService(
            GithubDeploymentRepository deploymentRepository,
            @Value("${github.token}") String githubToken) {

        this.deploymentRepository = deploymentRepository;

        this.restClient = RestClient.builder()
                .baseUrl("https://api.github.com")
                .defaultHeader("Accept", "application/vnd.github+json")
                .defaultHeader("Authorization", "Bearer " + githubToken)
                .defaultHeader("X-GitHub-Api-Version", "2022-11-28")
                .build();
    }

    public List<GithubDeployment> syncDeployments(
            String owner, String repo) {

        String repositoryName = owner + "/" + repo;

        List<Map<String, Object>> deployments =
                restClient.get()
                        .uri("/repos/{owner}/{repo}/deployments",
                                owner, repo)
                        .retrieve()
                        .body(new ParameterizedTypeReference<>() {});

        if (deployments == null) {
            return List.of();
        }

        for (Map<String, Object> deployment : deployments) {

            Long deploymentId =
                    ((Number) deployment.get("id")).longValue();

            List<Map<String, Object>> statuses =
                    restClient.get()
                            .uri("/repos/{owner}/{repo}/deployments/{id}/statuses",
                                    owner, repo, deploymentId)
                            .retrieve()
                            .body(new ParameterizedTypeReference<>() {});

            GithubDeployment savedDeployment =
                    deploymentRepository
                            .findByGithubDeploymentId(deploymentId)
                            .orElseGet(GithubDeployment::new);

            savedDeployment.setGithubDeploymentId(deploymentId);
            savedDeployment.setRepositoryFullName(repositoryName);
            savedDeployment.setEnvironment(
                    (String) deployment.get("environment"));
            savedDeployment.setRef(
                    (String) deployment.get("ref"));
            savedDeployment.setSha(
                    (String) deployment.get("sha"));
            savedDeployment.setTask(
                    (String) deployment.get("task"));
            savedDeployment.setDescription(
                    (String) deployment.get("description"));

            String createdAt = (String) deployment.get("created_at");

            if (createdAt != null) {
                savedDeployment.setCreatedAt(
                        Instant.parse(createdAt));
            }

            // Get the latest deployment status
            if (statuses != null && !statuses.isEmpty()) {

                Map<String, Object> latestStatus = statuses.get(0);

                savedDeployment.setStatus(
                        (String) latestStatus.get("state"));

                savedDeployment.setDeploymentUrl(
                        (String) latestStatus.get("target_url"));

            } else {
                savedDeployment.setStatus("pending");
                savedDeployment.setDeploymentUrl(null);
            }

            deploymentRepository.save(savedDeployment);
        }

        return deploymentRepository
                .findByRepositoryFullNameOrderByCreatedAtDesc(
                        repositoryName);
    }
}
