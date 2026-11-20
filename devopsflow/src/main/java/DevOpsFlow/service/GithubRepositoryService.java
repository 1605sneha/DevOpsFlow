
package DevOpsFlow.service;

import DevOpsFlow.model.GithubRepository;
import DevOpsFlow.repository.GithubRepositoryRepository;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class GithubRepositoryService {

    private final GithubRepositoryRepository repository;

    public GithubRepositoryService(
            GithubRepositoryRepository repository) {
        this.repository = repository;
    }

    public GithubRepository addRepository(GithubRepository githubRepository) {
        return repository.save(githubRepository);
    }

    public List<GithubRepository> getAllRepositories() {
        return repository.findAll();
    }
}
