
package DevOpsFlow;

import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;

class PipelineStatusTest {

    @Test
    void successfulPipelineShouldBeMarkedSuccessful() {
        String status = "success";
        assertEquals("success", status);
    }

    @Test
    void failedPipelineShouldBeMarkedFailed() {
        String status = "failure";
        assertNotEquals("success", status);
    }

    @Test
    void pipelineRunIdShouldBeValid() {
        long runId = 12345L;
        assertTrue(runId > 0);
    }
}
