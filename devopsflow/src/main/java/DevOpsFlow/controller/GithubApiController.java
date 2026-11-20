
package DevOpsFlow.controller;

import DevOpsFlow.service.GithubApiService;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/github")
@CrossOrigin(origins = "*")
public class GithubApiController {

    private final GithubApiService githubApiService;

    public GithubApiController(GithubApiService githubApiService) {
        this.githubApiService = githubApiService;
    }

    @GetMapping("/repos/{owner}/{repo}")
    public Map getRepository(
            @PathVariable String owner,
            @PathVariable String repo) {

        return githubApiService.getRepository(owner, repo);
    }
}
