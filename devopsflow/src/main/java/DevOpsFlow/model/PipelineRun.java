
package DevOpsFlow.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;

    @Entity
    @Table(name = "pipeline_runs")
    public class PipelineRun {

        @Id
        @GeneratedValue(strategy = GenerationType.IDENTITY)
        private Long id;

        private Long githubRunId;

        private String workflowName;

        private String status;

        private String conclusion;

        private String branch;

        private String runUrl;

        private LocalDateTime createdAt;

        public PipelineRun() {
        }

        public Long getId() {
            return id;
        }

        public Long getGithubRunId() {
            return githubRunId;
        }

        public void setGithubRunId(Long githubRunId) {
            this.githubRunId = githubRunId;
        }

        public String getWorkflowName() {
            return workflowName;
        }

        public void setWorkflowName(String workflowName) {
            this.workflowName = workflowName;
        }

        public String getStatus() {
            return status;
        }

        public void setStatus(String status) {
            this.status = status;
        }

        public String getConclusion() {
            return conclusion;
        }

        public void setConclusion(String conclusion) {
            this.conclusion = conclusion;
        }

        public String getBranch() {
            return branch;
        }

        public void setBranch(String branch) {
            this.branch = branch;
        }

        public String getRunUrl() {
            return runUrl;
        }

        public void setRunUrl(String runUrl) {
            this.runUrl = runUrl;
        }

        public LocalDateTime getCreatedAt() {
            return createdAt;
        }

        public void setCreatedAt(LocalDateTime createdAt) {
            this.createdAt = createdAt;
        }
    }


