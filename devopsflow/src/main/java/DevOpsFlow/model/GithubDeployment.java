
package DevOpsFlow.model;

import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name = "github_deployments")
public class GithubDeployment {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(unique = true, nullable = false)
    private Long githubDeploymentId;

    private String repositoryFullName;
    private String environment;
    private String ref;
    private String sha;
    private String task;
    private String description;
    private String status;
    private String deploymentUrl;

    private Instant createdAt;

    public GithubDeployment() {
    }

    public Long getId() {
        return id;
    }

    public Long getGithubDeploymentId() {
        return githubDeploymentId;
    }

    public void setGithubDeploymentId(Long githubDeploymentId) {
        this.githubDeploymentId = githubDeploymentId;
    }

    public String getRepositoryFullName() {
        return repositoryFullName;
    }

    public void setRepositoryFullName(String repositoryFullName) {
        this.repositoryFullName = repositoryFullName;
    }

    public String getEnvironment() {
        return environment;
    }

    public void setEnvironment(String environment) {
        this.environment = environment;
    }

    public String getRef() {
        return ref;
    }

    public void setRef(String ref) {
        this.ref = ref;
    }

    public String getSha() {
        return sha;
    }

    public void setSha(String sha) {
        this.sha = sha;
    }

    public String getTask() {
        return task;
    }

    public void setTask(String task) {
        this.task = task;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public String getDeploymentUrl() {
        return deploymentUrl;
    }

    public void setDeploymentUrl(String deploymentUrl) {
        this.deploymentUrl = deploymentUrl;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(Instant createdAt) {
        this.createdAt = createdAt;
    }
}
