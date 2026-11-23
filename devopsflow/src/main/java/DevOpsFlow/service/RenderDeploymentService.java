
package DevOpsFlow.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.HttpHeaders;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

import java.util.List;
import java.util.Map;

@Service
public class RenderDeploymentService {

    private final RestClient restClient;
    private final String serviceId;

    public RenderDeploymentService(
            @Value("${RENDER_API_KEY}") String apiKey,
            @Value("${RENDER_SERVICE_ID}") String serviceId) {

        this.serviceId = serviceId;

        this.restClient = RestClient.builder()
                .baseUrl("https://api.render.com/v1")
                .defaultHeader(HttpHeaders.AUTHORIZATION, "Bearer " + apiKey)
                .defaultHeader(HttpHeaders.ACCEPT, "application/json")
                .build();
    }


    public List<Map<String, Object>> getDeployments() {

        List<Map<String, Object>> response = restClient.get()
                .uri("/services/{serviceId}/deploys?limit=20", serviceId)
                .retrieve()
                .body(new ParameterizedTypeReference<>() {});

        if (response == null) {
            return List.of();
        }

        return response.stream()
                .map(item -> {
                    Object deploy = item.get("deploy");

                    if (deploy instanceof Map<?, ?> deployMap) {
                        Map<String, Object> result = new java.util.HashMap<>();

                        deployMap.forEach((key, value) -> {
                            if (key instanceof String) {
                                result.put((String) key, value);
                            }
                        });

                        return result;
                    }

                    return item;
                })
                .toList();
    }

}
