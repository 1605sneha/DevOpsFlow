
package DevOpsFlow.repository;

import DevOpsFlow.model.GithubDeployment;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface GithubDeploymentRepository
        extends JpaRepository<GithubDeployment, Long> {

    Optional<GithubDeployment> findByGithubDeploymentId(
            Long githubDeploymentId
    );

    List<GithubDeployment> findByRepositoryFullNameOrderByCreatedAtDesc(
            String repositoryFullName
    );
}
