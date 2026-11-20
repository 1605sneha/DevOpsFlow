
package DevOpsFlow.repository;

import DevOpsFlow.model.PipelineRun;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface PipelineRunRepository
        extends JpaRepository<PipelineRun, Long> {

    Optional<PipelineRun> findByGithubRunId(Long githubRunId);
}
