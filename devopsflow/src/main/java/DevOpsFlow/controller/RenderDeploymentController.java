
package DevOpsFlow.controller;

import DevOpsFlow.service.RenderDeploymentService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/render")
public class RenderDeploymentController {

    private final RenderDeploymentService deploymentService;

    public RenderDeploymentController(
            RenderDeploymentService deploymentService) {
        this.deploymentService = deploymentService;
    }

    @GetMapping("/deployments")
    public ResponseEntity<List<Map<String, Object>>> getDeployments() {
        return ResponseEntity.ok(deploymentService.getDeployments());
    }
}

