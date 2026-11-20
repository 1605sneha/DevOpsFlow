
package DevOpsFlow.repository;

import DevOpsFlow.model.GithubRepository;
import org.springframework.data.jpa.repository.JpaRepository;

public interface GithubRepositoryRepository
        extends JpaRepository<GithubRepository, Long> {
}
