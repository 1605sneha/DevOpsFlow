
package DevOpsFlow.controller;

import DevOpsFlow.model.GithubDeployment;
import DevOpsFlow.repository.GithubDeploymentRepository;
import DevOpsFlow.service.GithubDeploymentService;

import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/deployments")
@CrossOrigin(origins = "*")
public class GithubDeploymentController {

    private final GithubDeploymentService deploymentService;
    private final GithubDeploymentRepository deploymentRepository;

    public GithubDeploymentController(
            GithubDeploymentService deploymentService,
            GithubDeploymentRepository deploymentRepository) {

        this.deploymentService = deploymentService;
        this.deploymentRepository = deploymentRepository;
    }

    // Synchronize deployments from GitHub
    @PostMapping("/sync/{owner}/{repo}")
    public List<GithubDeployment> syncDeployments(
            @PathVariable String owner,
            @PathVariable String repo) {

        return deploymentService.syncDeployments(owner, repo);
    }

    // Retrieve saved deployment history
    @GetMapping("/{owner}/{repo}")
    public List<GithubDeployment> getDeployments(
            @PathVariable String owner,
            @PathVariable String repo) {

        String repositoryName = owner + "/" + repo;

        return deploymentRepository
                .findByRepositoryFullNameOrderByCreatedAtDesc(
                        repositoryName);
    }
}
