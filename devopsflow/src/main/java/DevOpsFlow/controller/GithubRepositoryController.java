
package DevOpsFlow.controller;

import DevOpsFlow.model.GithubRepository;
import DevOpsFlow.service.GithubRepositoryService;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/repositories")
@CrossOrigin(origins = "*")
public class GithubRepositoryController {

    private final GithubRepositoryService service;

    public GithubRepositoryController(GithubRepositoryService service) {
        this.service = service;
    }

    @PostMapping
    public GithubRepository addRepository(
            @RequestBody GithubRepository githubRepository) {
        return service.addRepository(githubRepository);
    }

    @GetMapping
    public List<GithubRepository> getAllRepositories() {
        return service.getAllRepositories();
    }
}
