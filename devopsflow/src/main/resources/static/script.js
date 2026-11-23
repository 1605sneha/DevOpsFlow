
/* ==========================================
   DEVOPSFLOW - FRONTEND CONFIGURATION
========================================== */

const API_BASE = "/api";

const REPOSITORY_OWNER = "1605sneha";
const REPOSITORY_NAME = "DevOpsFlow";

let liveRuns = [];
let historyRuns = [];
let deploymentRecords = [];

let knownRunStates = new Map();
let hasLoadedInitialRuns = false;
let isDashboardRefreshing = false;
let deploymentControlsInitialized = false;


/* ==========================================
   API HELPER
========================================== */

async function apiRequest(endpoint, options = {}) {

    const headers = { ...(options.headers || {}) };

    if (options.body && !headers["Content-Type"]) {
        headers["Content-Type"] = "application/json";
    }

    const response = await fetch(`${API_BASE}${endpoint}`, {
        ...options,
        headers
    });

    if (!response.ok) {
        const message = await response.text();
        throw new Error(
            message || `HTTP Error: ${response.status}`
        );
    }

    if (response.status === 204) {
        return null;
    }

    const contentType =
        response.headers.get("content-type") || "";

    if (contentType.includes("application/json")) {
        return response.json();
    }

    return response.text();
}


/* ==========================================
   SAFE HTML OUTPUT
========================================== */

function escapeHTML(value) {

    return String(value ?? "").replace(
        /[&<>"']/g,
        character => ({
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#39;"
        })[character]
    );
}


/* ==========================================
   MODAL VISIBILITY
========================================== */

function setModalVisible(modal, visible) {

    if (!modal) return;

    modal.hidden = !visible;
    modal.style.display = visible ? "flex" : "none";

    if (visible) {
        modal.removeAttribute("aria-hidden");
    } else {
        modal.setAttribute("aria-hidden", "true");
    }
}


/* ==========================================
   TOAST NOTIFICATIONS
========================================== */

function showToast(message, type = "success") {

    const container =
        document.getElementById("toastContainer");

    if (!container) {
        console.log(`[${type}] ${message}`);
        return;
    }

    const toast = document.createElement("div");

    toast.className = `toast ${type}`;
    toast.textContent = message;

    container.appendChild(toast);

    setTimeout(() => {
        toast.remove();
    }, 4000);
}


/* ==========================================
   PIPELINE COMPLETION NOTIFICATIONS
========================================== */

function notifyPipelineCompletion(run, status) {

    const workflowName = run.name || "Pipeline";

    if (status === "success") {

        showToast(
            `${workflowName} completed successfully!`,
            "success"
        );

    } else if (status === "failure") {

        showToast(
            `${workflowName} failed. Check GitHub Actions logs.`,
            "error"
        );

    }
}


/* ==========================================
   PIPELINE STATUS
========================================== */

function getRunStatus(run) {

    const status =
        String(run.status || "").toLowerCase();

    const conclusion =
        String(run.conclusion || "").toLowerCase();

    if (status === "queued" || status === "waiting") {
        return "queued";
    }

    if (status === "in_progress" || status === "requested") {
        return "running";
    }

    if (conclusion === "success") {
        return "success";
    }

    if (
        conclusion === "failure" ||
        conclusion === "timed_out" ||
        conclusion === "action_required"
    ) {
        return "failure";
    }

    return "neutral";
}


/* ==========================================
   STATUS BADGES
========================================== */

function getStatusBadge(run) {

    const status = getRunStatus(run);

    const labels = {
        success: "✓ Success",
        failure: "✕ Failed",
        running: "◷ Running",
        queued: "◌ Queued",
        neutral:
            run.conclusion ||
            run.status ||
            "Unknown"
    };

    return `
        <span class="status-badge status-${status}">
            ${escapeHTML(labels[status])}
        </span>
    `;
}


/* ==========================================
   DATE FORMATTING
========================================== */

function formatDate(dateValue) {

    if (!dateValue) {
        return "Not available";
    }

    const date = new Date(dateValue);

    if (Number.isNaN(date.getTime())) {
        return "Not available";
    }

    return date.toLocaleString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit"
    });
}


/* ==========================================
   LOAD LIVE PIPELINE RUNS
========================================== */

async function loadPipelineRuns() {

    const tbody =
        document.getElementById("pipelineTableBody");

    try {

        const data = await apiRequest(
            `/pipeline/runs/${REPOSITORY_OWNER}/${REPOSITORY_NAME}`
        );

        const newRuns = Array.isArray(data?.workflow_runs)
            ? data.workflow_runs
            : Array.isArray(data)
                ? data
                : [];

        newRuns.forEach(run => {

            const runId = String(run.id);
            const currentStatus = getRunStatus(run);
            const previousStatus = knownRunStates.get(runId);

            if (
                hasLoadedInitialRuns &&
                previousStatus &&
                ["running", "queued"].includes(previousStatus) &&
                ["success", "failure"].includes(currentStatus)
            ) {
                notifyPipelineCompletion(run, currentStatus);
            }

            knownRunStates.set(runId, currentStatus);

        });

        hasLoadedInitialRuns = true;
        liveRuns = newRuns;

        renderPipelineTable();

        const githubStatus =
            document.getElementById("githubStatus");

        const githubIndicator =
            document.getElementById("githubIndicator");

        if (githubStatus) {
            githubStatus.textContent = "GitHub API responding";
        }

        if (githubIndicator) {
            githubIndicator.style.color = "var(--green)";
        }

    } catch (error) {

        console.error("GitHub API error:", error);

        if (tbody) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="5" class="empty-state">
                        Unable to load live pipeline runs.
                        Check backend connection and GitHub token.
                    </td>
                </tr>
            `;
        }

        const githubStatus =
            document.getElementById("githubStatus");

        const githubIndicator =
            document.getElementById("githubIndicator");

        if (githubStatus) {
            githubStatus.textContent = "GitHub API unavailable";
        }

        if (githubIndicator) {
            githubIndicator.style.color = "var(--red)";
        }
    }
}


/* ==========================================
   RENDER LIVE PIPELINE TABLE
========================================== */

function renderPipelineTable() {

    const tbody =
        document.getElementById("pipelineTableBody");

    if (!tbody) return;

    const searchText = (
        document.getElementById("searchInput")?.value || ""
    ).toLowerCase();

    const selectedStatus =
        document.getElementById("statusFilter")?.value || "all";

    const filteredRuns = liveRuns.filter(run => {

        const name =
            String(run.name || "").toLowerCase();

        const branch =
            String(run.head_branch || "").toLowerCase();

        const matchesSearch =
            name.includes(searchText) ||
            branch.includes(searchText);

        const status = getRunStatus(run);

        const matchesStatus =
            selectedStatus === "all" ||
            status === selectedStatus;

        return matchesSearch && matchesStatus;
    });

    const liveCount =
        document.getElementById("liveCount");

    if (liveCount) {
        liveCount.textContent =
            `${filteredRuns.length} pipeline runs`;
    }

    if (filteredRuns.length === 0) {

        tbody.innerHTML = `
            <tr>
                <td colspan="5" class="empty-state">
                    No matching pipeline runs found.
                </td>
            </tr>
        `;

        return;
    }

    tbody.innerHTML = filteredRuns.map(run => {

        const runUrl = String(run.html_url || "");

        const safeUrl =
            /^https:\/\/github\.com\//i.test(runUrl)
                ? escapeHTML(runUrl)
                : "#";

        return `
            <tr>
                <td>
                    <span class="workflow-name">
                        ${escapeHTML(run.name || "Unnamed Workflow")}
                    </span>

                    <span class="workflow-sub">
                        Run #${escapeHTML(run.run_number ?? run.id)}
                    </span>
                </td>

                <td>
                    ${escapeHTML(run.head_branch || "Unknown")}
                </td>

                <td>
                    ${getStatusBadge(run)}
                </td>

                <td>
                    ${escapeHTML(formatDate(run.created_at))}
                </td>

                <td>
                    <a class="action-link"
                       href="${safeUrl}"
                       target="_blank"
                       rel="noopener noreferrer">
                        View ↗
                    </a>
                </td>
            </tr>
        `;

    }).join("");
}


/* ==========================================
   LOAD POSTGRESQL PIPELINE HISTORY
========================================== */

async function loadPipelineHistory() {

    const historyContainer =
        document.getElementById("historyList");

    try {

        const data = await apiRequest("/pipeline/history");

        historyRuns = Array.isArray(data) ? data : [];

        renderHistory();
        updateStatistics();

        const databaseStatus =
            document.getElementById("databaseStatus");

        const databaseIndicator =
            document.getElementById("databaseIndicator");

        if (databaseStatus) {
            databaseStatus.textContent = "Pipeline records retrieved";
        }

        if (databaseIndicator) {
            databaseIndicator.style.color = "var(--green)";
        }

    } catch (error) {

        console.error("History API error:", error);

        if (historyContainer) {
            historyContainer.innerHTML = `
                <div class="empty-state">
                    Unable to retrieve PostgreSQL pipeline history.
                </div>
            `;
        }

        const databaseStatus =
            document.getElementById("databaseStatus");

        const databaseIndicator =
            document.getElementById("databaseIndicator");

        if (databaseStatus) {
            databaseStatus.textContent = "History API unavailable";
        }

        if (databaseIndicator) {
            databaseIndicator.style.color = "var(--red)";
        }
    }
}


/* ==========================================
   RENDER EXECUTION HISTORY
========================================== */

function renderHistory() {

    const container =
        document.getElementById("historyList");

    if (!container) return;

    if (historyRuns.length === 0) {

        container.innerHTML = `
            <div class="empty-state">
                No pipeline history found.
                Synchronize your GitHub runs first.
            </div>
        `;

        return;
    }

    const sortedRuns = [...historyRuns].sort(
        (a, b) =>
            new Date(b.createdAt || 0) -
            new Date(a.createdAt || 0)
    );

    container.innerHTML = sortedRuns
        .slice(0, 10)
        .map(run => {

            const status = getRunStatus(run);

            const symbols = {
                success: "✓",
                failure: "✕",
                running: "◷",
                queued: "◌",
                neutral: "•"
            };

            const runUrl = String(run.runUrl || "");

            const safeUrl =
                /^https:\/\/github\.com\//i.test(runUrl)
                    ? escapeHTML(runUrl)
                    : null;

            const linkMarkup = safeUrl
                ? `<div>
                        <a class="action-link"
                           href="${safeUrl}"
                           target="_blank"
                           rel="noopener noreferrer">
                            Open ↗
                        </a>
                   </div>`
                : "";

            return `
                <div class="history-item">

                    <div class="history-symbol">
                        ${symbols[status]}
                    </div>

                    <div class="history-info">
                        <strong>
                            ${escapeHTML(run.workflowName || "Unnamed Workflow")}
                        </strong>

                        <small>
                            Run ID: ${escapeHTML(run.githubRunId)}
                            · ${escapeHTML(run.branch || "Unknown branch")}
                        </small>
                    </div>

                    ${getStatusBadge(run)}

                    <div class="history-date">
                        ${escapeHTML(formatDate(run.createdAt))}
                        ${linkMarkup}
                    </div>

                </div>
            `;

        }).join("");
}


/* ==========================================
   DASHBOARD STATISTICS
========================================== */

function updateStatistics() {

    const total = historyRuns.length;

    const successful = historyRuns.filter(
        run => getRunStatus(run) === "success"
    ).length;

    const failed = historyRuns.filter(
        run => getRunStatus(run) === "failure"
    ).length;

    const running = historyRuns.filter(
        run => ["running", "queued"].includes(getRunStatus(run))
    ).length;

    const completed = successful + failed;

    const rate = completed > 0
        ? Math.round((successful / completed) * 100)
        : 0;

    const setText = (id, value) => {

        const element = document.getElementById(id);

        if (element) {
            element.textContent = value;
        }
    };

    setText("totalPipelines", total);
    setText("successfulPipelines", successful);
    setText("failedPipelines", failed);
    setText("runningPipelines", running);

    setText("successRate", `${rate}%`);

    setText("legendSuccess", successful);
    setText("legendFailed", failed);
    setText("legendRunning", running);

    const successAngle = completed > 0
        ? (successful / completed) * 360
        : 0;

    const failureAngle = completed > 0
        ? (failed / completed) * 360
        : 0;

    const donut = document.getElementById("successDonut");

    if (donut) {

        donut.style.background = `
            conic-gradient(
                var(--green) 0deg ${successAngle}deg,
                var(--red) ${successAngle}deg ${successAngle + failureAngle}deg,
                var(--amber) ${successAngle + failureAngle}deg 360deg
            )
        `;
    }
}


/* ==========================================
   MANUAL PIPELINE SYNCHRONIZATION
========================================== */

async function syncPipelineRuns() {

    const button = document.getElementById("syncButton");

    if (button) {
        button.disabled = true;
        button.textContent = "Syncing...";
    }

    try {

        const result = await apiRequest(
            `/pipeline/sync/${REPOSITORY_OWNER}/${REPOSITORY_NAME}`,
            { method: "POST" }
        );

        showToast("Pipeline data synchronized successfully!");

        const lastUpdated =
            document.getElementById("lastUpdated");

        if (lastUpdated) {
            lastUpdated.textContent =
                `Last synced: ${new Date().toLocaleTimeString()}`;
        }

        await loadPipelineHistory();

        return result;

    } catch (error) {

        console.error("Pipeline sync error:", error);

        showToast(
            "Pipeline synchronization failed: " + error.message,
            "error"
        );

    } finally {

        if (button) {
            button.disabled = false;
            button.textContent = "⇄ Sync Data";
        }
    }
}


/* ==========================================
   REFRESH AFTER WORKFLOW DISPATCH
========================================== */

function refreshAfterTrigger() {

    [3000, 8000, 15000].forEach(delay => {

        setTimeout(() => {
            refreshDashboard();
        }, delay);

    });
}


/* ==========================================
   ORIGINAL CI PIPELINE TRIGGER
========================================== */

async function triggerPipeline() {

    const button = document.getElementById("confirmTrigger");

    if (button) {
        button.disabled = true;
        button.textContent = "Triggering...";
    }

    try {

        await apiRequest(
            `/pipeline/trigger/${REPOSITORY_OWNER}/${REPOSITORY_NAME}`,
            { method: "POST" }
        );

        showToast(
            "Pipeline dispatch request submitted successfully!"
        );

        closeTriggerModal();
        refreshAfterTrigger();

    } catch (error) {

        console.error("Trigger error:", error);

        showToast(
            "Unable to trigger pipeline: " + error.message,
            "error"
        );

    } finally {

        if (button) {
            button.disabled = false;
            button.textContent = "Confirm & Run";
        }
    }
}


/* ==========================================
   DEPLOYMENT STATUS NORMALIZATION
========================================== */

function normalizeDeploymentStatus(status) {

    const value = String(status || "").toLowerCase();

    if (["success", "successful", "active"].includes(value)) {
        return "success";
    }

    if (["failure", "failed", "error"].includes(value)) {
        return "failure";
    }

    if (
        ["in_progress", "in progress", "queued", "pending"].includes(value)
    ) {
        return "running";
    }

    return "neutral";
}


/* ==========================================
   LOAD DEPLOYMENTS FROM POSTGRESQL
========================================== */

async function loadDeployments() {

    const tbody =
        document.getElementById("deploymentTableBody");

    try {

        const data = await apiRequest(
            `/deployments/${REPOSITORY_OWNER}/${REPOSITORY_NAME}`
        );

        deploymentRecords = Array.isArray(data)
            ? data
            : Array.isArray(data?.deployments)
                ? data.deployments
                : [];

        renderDeploymentTable();
        updateEnvironmentStatus();

    } catch (error) {

        console.error("Deployment loading failed:", error);

        if (tbody) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="5" class="empty-state">
                        Unable to load deployment history.
                    </td>
                </tr>
            `;
        }
    }
}


/* ==========================================
   RENDER DEPLOYMENT HISTORY TABLE
========================================== */

function renderDeploymentTable() {

    const tbody =
        document.getElementById("deploymentTableBody");

    if (!tbody) return;

    if (deploymentRecords.length === 0) {

        tbody.innerHTML = `
            <tr>
                <td colspan="5" class="empty-state">
                    No deployment records found.
                    Synchronize deployments to retrieve records.
                </td>
            </tr>
        `;

        return;
    }

    const sortedRecords = [...deploymentRecords].sort(
        (a, b) =>
            new Date(b.createdAt || 0) -
            new Date(a.createdAt || 0)
    );

    tbody.innerHTML = sortedRecords.map(deployment => {

        const status =
            normalizeDeploymentStatus(deployment.status);

        const deploymentUrl = String(
            deployment.deploymentUrl ||
            deployment.targetUrl ||
            ""
        );

        const safeUrl =
            /^https:\/\/[^ ]+$/i.test(deploymentUrl)
                ? escapeHTML(deploymentUrl)
                : null;

        const linkMarkup = safeUrl
            ? `<a class="action-link"
                  href="${safeUrl}"
                  target="_blank"
                  rel="noopener noreferrer">
                  View ↗
               </a>`
            : "Not available";

        return `
            <tr>

                <td>
                    ${escapeHTML(deployment.environment || "Unknown")}
                </td>

                <td>
                    ${escapeHTML(deployment.ref || "Unknown")}
                </td>

                <td>
                    <span class="status-badge status-${status}">
                        ${escapeHTML(deployment.status || "Unknown")}
                    </span>
                </td>

                <td>
                    ${escapeHTML(formatDate(deployment.createdAt))}
                </td>

                <td>
                    ${linkMarkup}
                </td>

            </tr>
        `;

    }).join("");
}


/* ==========================================
   ENVIRONMENT STATUS CARDS
========================================== */

function updateEnvironmentStatus() {

    const environments = {
        development: "developmentStatus",
        testing: "testingStatus",
        production: "productionStatus"
    };

    Object.entries(environments).forEach(([environment, elementId]) => {

        const element = document.getElementById(elementId);

        if (!element) return;

        const matchingRecords = deploymentRecords
            .filter(deployment =>
                String(deployment.environment || "")
                    .toLowerCase() === environment
            )
            .sort(
                (a, b) =>
                    new Date(b.createdAt || 0) -
                    new Date(a.createdAt || 0)
            );

        if (matchingRecords.length === 0) {
            element.textContent = "No deployments";
            return;
        }

        element.textContent =
            matchingRecords[0].status || "Unknown";

    });
}


/* ==========================================
   MANUAL DEPLOYMENT SYNCHRONIZATION
========================================== */

async function syncDeployments() {

    const button =
        document.getElementById("syncDeploymentsBtn");

    if (button) {
        button.disabled = true;
        button.textContent = "Syncing...";
    }

    try {

        await apiRequest(
            `/deployments/sync/${REPOSITORY_OWNER}/${REPOSITORY_NAME}`,
            { method: "POST" }
        );

        showToast(
            "Deployment data synchronized successfully!"
        );

        await loadDeployments();

        const lastUpdated =
            document.getElementById("lastUpdated");

        if (lastUpdated) {
            lastUpdated.textContent =
                `Last synced: ${new Date().toLocaleTimeString()}`;
        }

    } catch (error) {

        console.error(
            "Deployment synchronization failed:",
            error
        );

        showToast(
            "Deployment synchronization failed: " + error.message,
            "error"
        );

    } finally {

        if (button) {
            button.disabled = false;
            button.textContent = "⇄ Sync Deployments";
        }
    }
}


/* ==========================================
   AUTOMATIC DEPLOYMENT SYNCHRONIZATION
========================================== */

async function syncDeploymentsAutomatically() {

    try {

        await apiRequest(
            `/deployments/sync/${REPOSITORY_OWNER}/${REPOSITORY_NAME}`,
            { method: "POST" }
        );

    } catch (error) {

        console.error(
            "Automatic deployment synchronization failed:",
            error
        );
    }
}


/* ==========================================
   BACKEND HEALTH CHECK
========================================== */

async function checkBackendHealth() {

    const connectionStatus =
        document.getElementById("connectionStatus");

    const backendStatus =
        document.getElementById("backendStatus");

    const backendIndicator =
        document.getElementById("backendIndicator");

    try {

        await apiRequest("/health");

        if (connectionStatus) {
            connectionStatus.textContent = "Connected successfully";
        }

        if (backendStatus) {
            backendStatus.textContent = "Spring Boot is responding";
        }

        if (backendIndicator) {
            backendIndicator.style.color = "var(--green)";
        }

    } catch (error) {

        if (connectionStatus) {
            connectionStatus.textContent = "Connection failed";
        }

        if (backendStatus) {
            backendStatus.textContent = "Backend unavailable";
        }

        if (backendIndicator) {
            backendIndicator.style.color = "var(--red)";
        }

        throw error;
    }
}


/* ==========================================
   AUTOMATIC PIPELINE SYNCHRONIZATION
========================================== */

async function syncPipelineRunsAutomatically() {

    try {

        await apiRequest(
            `/pipeline/sync/${REPOSITORY_OWNER}/${REPOSITORY_NAME}`,
            { method: "POST" }
        );

        const lastUpdated =
            document.getElementById("lastUpdated");

        if (lastUpdated) {
            lastUpdated.textContent =
                `Last synced: ${new Date().toLocaleTimeString()}`;
        }

    } catch (error) {

        console.error(
            "Automatic pipeline synchronization failed:",
            error
        );
    }
}


/* ==========================================
   AUTOMATIC DASHBOARD REFRESH
========================================== */

async function refreshDashboard() {

    if (isDashboardRefreshing) {
        return;
    }

    isDashboardRefreshing = true;

    try {

        await checkBackendHealth();
        await loadPipelineRuns();
        await syncPipelineRunsAutomatically();
        await loadPipelineHistory();
        await syncDeploymentsAutomatically();
        await loadDeployments();

    } catch (error) {

        console.error("Dashboard refresh failed:", error);

    } finally {

        isDashboardRefreshing = false;
    }
}


/* ==========================================
   ORIGINAL PIPELINE MODAL
========================================== */

function openTriggerModal() {

    setModalVisible(
        document.getElementById("confirmModal"),
        true
    );
}


function closeTriggerModal() {

    setModalVisible(
        document.getElementById("confirmModal"),
        false
    );
}


/* ==========================================
   THEME SWITCHER
========================================== */

function initializeTheme() {

    const savedTheme =
        localStorage.getItem("devopsflow-theme");

    if (savedTheme === "light") {
        document.body.classList.add("light");
    }
}


function toggleTheme() {

    document.body.classList.toggle("light");

    const theme =
        document.body.classList.contains("light")
            ? "light"
            : "dark";

    localStorage.setItem("devopsflow-theme", theme);
}


/* ==========================================
   MOBILE SIDEBAR
========================================== */

function toggleSidebar() {

    const sidebar =
        document.getElementById("sidebar");

    if (sidebar) {
        sidebar.classList.toggle("open");
    }
}


/* ==========================================
   DEPLOYMENT CONTROL CENTER
   CORRECTED DIRECT EVENT HANDLERS
========================================== */

function initializeDeploymentControlCenter() {

    if (deploymentControlsInitialized) {
        return;
    }

    const triggerButton =
        document.getElementById("triggerDeploymentBtn");

    const environmentSelect =
        document.getElementById("deploymentEnvironment");

    const modal =
        document.getElementById("deploymentConfirmModal");

    const environmentPreview =
        document.getElementById("deploymentEnvironmentPreview");

    const confirmButton =
        document.getElementById("confirmDeployment");

    const cancelButton =
        document.getElementById("cancelDeployment");

    const closeButton =
        document.getElementById("closeDeploymentModal");

    const message =
        document.getElementById("deploymentMessage");

    const allowedEnvironments = [
        "development",
        "testing",
        "production"
    ];

    console.log(
        "Initializing DevOpsFlow Deployment Control Center..."
    );

    if (!triggerButton) {
        console.error(
            "Missing element: triggerDeploymentBtn"
        );
        return;
    }

    if (!environmentSelect) {
        console.error(
            "Missing element: deploymentEnvironment"
        );
        return;
    }

    if (!modal) {
        console.error(
            "Missing element: deploymentConfirmModal"
        );
        return;
    }

    if (!environmentPreview) {
        console.error(
            "Missing element: deploymentEnvironmentPreview"
        );
        return;
    }

    if (!confirmButton) {
        console.error(
            "Missing element: confirmDeployment"
        );
        return;
    }

    // Set button types to prevent accidental form submission.
    triggerButton.type = "button";
    confirmButton.type = "button";

    if (cancelButton) {
        cancelButton.type = "button";
    }

    if (closeButton) {
        closeButton.type = "button";
    }

    // Hide confirmation modal initially.
    setModalVisible(modal, false);

    function closeDeploymentModal() {

        setModalVisible(modal, false);

    }

    function openDeploymentModal(event) {

        if (event) {
            event.preventDefault();
            event.stopPropagation();
        }

        console.log(
            "DEPLOYMENT BUTTON CLICK DETECTED"
        );

        const environment =
            environmentSelect.value.trim().toLowerCase();

        if (!allowedEnvironments.includes(environment)) {

            if (message) {
                message.textContent =
                    "Please select a valid environment.";
            }

            showToast(
                "Invalid deployment environment.",
                "error"
            );

            return;
        }

        environmentPreview.textContent = environment;

        setModalVisible(modal, true);

        console.log(
            "Deployment confirmation opened:",
            environment
        );
    }

    // DIRECT listener on the actual trigger button.
    triggerButton.addEventListener(
        "click",
        openDeploymentModal
    );

    if (cancelButton) {

        cancelButton.addEventListener("click", event => {

            event.preventDefault();
            closeDeploymentModal();

        });
    }

    if (closeButton) {

        closeButton.addEventListener("click", event => {

            event.preventDefault();
            closeDeploymentModal();

        });
    }

    modal.addEventListener("click", event => {

        if (event.target === modal) {
            closeDeploymentModal();
        }

    });

    document.addEventListener("keydown", event => {

        if (
            event.key === "Escape" &&
            !modal.hidden
        ) {
            closeDeploymentModal();
        }

    });

    // CONFIRM AND DISPATCH WORKFLOW.
    confirmButton.addEventListener("click", async event => {

        event.preventDefault();
        event.stopPropagation();

        const environment =
            environmentPreview.textContent
                .trim()
                .toLowerCase();

        if (!allowedEnvironments.includes(environment)) {

            showToast(
                "Invalid deployment environment.",
                "error"
            );

            closeDeploymentModal();
            return;
        }

        confirmButton.disabled = true;
        triggerButton.disabled = true;

        const originalConfirmText =
            confirmButton.textContent;

        confirmButton.textContent = "Triggering...";

        if (message) {
            message.textContent =
                `Triggering ${environment} deployment...`;
        }

        try {

            const endpoint =
                `/pipeline/trigger/${REPOSITORY_OWNER}/${REPOSITORY_NAME}` +
                `?environment=${encodeURIComponent(environment)}`;

            console.log(
                "Sending deployment request:",
                `${API_BASE}${endpoint}`
            );

            await apiRequest(endpoint, {
                method: "POST"
            });

            console.log(
                "GitHub workflow dispatch accepted:",
                environment
            );

            if (message) {
                message.textContent =
                    `${environment.toUpperCase()} deployment workflow dispatch accepted.`;
            }

            showToast(
                `${environment.toUpperCase()} workflow triggered successfully!`,
                "success"
            );

            closeDeploymentModal();

            refreshAfterTrigger();

        } catch (error) {

            console.error(
                "Deployment trigger failed:",
                error
            );

            if (message) {
                message.textContent =
                    `Deployment failed: ${error.message}`;
            }

            showToast(
                `Deployment failed: ${error.message}`,
                "error"
            );

        } finally {

            confirmButton.disabled = false;
            triggerButton.disabled = false;

            confirmButton.textContent =
                originalConfirmText || "Confirm & Deploy";

        }
    });

    deploymentControlsInitialized = true;

    console.log(
        "Deployment Control Center initialized successfully."
    );
}


/* ==========================================
   ORIGINAL DASHBOARD EVENT LISTENERS
========================================== */

function initializeEventListeners() {

    const addClickListener = (id, callback) => {

        const element =
            document.getElementById(id);

        if (element) {
            element.addEventListener("click", callback);
        }

    };

    // Original pipeline trigger.
    addClickListener(
        "triggerButton",
        openTriggerModal
    );

    addClickListener(
        "confirmTrigger",
        triggerPipeline
    );

    addClickListener(
        "cancelTrigger",
        closeTriggerModal
    );

    addClickListener(
        "closeModal",
        closeTriggerModal
    );

    // Pipeline synchronization.
    addClickListener(
        "syncButton",
        syncPipelineRuns
    );

    // Dashboard refresh.
    addClickListener(
        "refreshButton",
        refreshDashboard
    );

    addClickListener(
        "liveRefreshButton",
        loadPipelineRuns
    );

    addClickListener(
        "historyRefreshButton",
        loadPipelineHistory
    );

    // Theme switching.
    addClickListener(
        "themeButton",
        toggleTheme
    );

    // Sidebar.
    addClickListener(
        "menuButton",
        toggleSidebar
    );

    // Deployment sync:
    // Your original HTML uses onclick="syncDeployments()".
    // Do not add a second listener to that same button.

    // Original pipeline modal backdrop.
    const modal =
        document.getElementById("confirmModal");

    if (modal) {

        modal.addEventListener("click", event => {

            if (event.target === modal) {
                closeTriggerModal();
            }

        });
    }

    // Pipeline search.
    const searchInput =
        document.getElementById("searchInput");

    if (searchInput) {

        searchInput.addEventListener(
            "input",
            renderPipelineTable
        );
    }

    // Pipeline status filter.
    const statusFilter =
        document.getElementById("statusFilter");

    if (statusFilter) {

        statusFilter.addEventListener(
            "change",
            renderPipelineTable
        );
    }

    // Sidebar navigation.
    document.querySelectorAll(".nav-link").forEach(link => {

        link.addEventListener("click", () => {

            document.querySelectorAll(".nav-link").forEach(item => {
                item.classList.remove("active");
            });

            link.classList.add("active");

            document.getElementById("sidebar")
                ?.classList.remove("open");

        });

    });
}

/* ==========================================
   RENDER CLOUD DEPLOYMENT MONITORING
========================================== */

async function loadRenderDeployments() {

    const tbody = document.getElementById(
        "renderDeploymentTableBody"
    );

    const statusText = document.getElementById(
        "renderDeploymentStatus"
    );

    if (!tbody) return;

    try {
        const deployments = await apiRequest(
            "/render/deployments"
        );

        if (!Array.isArray(deployments)) {
            throw new Error("Invalid deployment response");
        }

        if (statusText) {
            statusText.textContent =
                `${deployments.length} Render deployment records retrieved`;
        }

        if (deployments.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="5" class="empty-state">
                        No Render deployments found.
                    </td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = deployments.map(deployment => {

            const rawStatus = String(
                deployment.status || "unknown"
            );

            const status = rawStatus.toLowerCase();

            const badgeClass =
                status === "live"
                    ? "success"
                    : ["build_failed", "update_failed", "canceled", "deactivated"].includes(status)
                        ? "failure"
                        : ["building", "updating", "pre_deploy", "pending"].includes(status)
                            ? "running"
                            : "neutral";

            const commit = deployment.commit?.id ||
                deployment.commit?.message ||
                "Not available";

            return `
                <tr>
                    <td>${escapeHTML(deployment.id || "Unknown")}</td>

                    <td>
                        <span class="status-badge status-${badgeClass}">
                            ${escapeHTML(rawStatus)}
                        </span>
                    </td>

                    <td>${escapeHTML(commit)}</td>

                    <td>${escapeHTML(formatDate(deployment.createdAt))}</td>

                    <td>${escapeHTML(formatDate(deployment.finishedAt))}</td>
                </tr>
            `;

        }).join("");

    } catch (error) {

        console.error("Render monitoring error:", error);

        if (statusText) {
            statusText.textContent =
                "Unable to retrieve Render deployment data.";
        }

        tbody.innerHTML = `
            <tr>
                <td colspan="5" class="empty-state">
                    Render deployment monitoring unavailable.
                </td>
            </tr>
        `;
    }
}



/* ==========================================
   INITIALIZE APPLICATION
========================================== */

function initializeApplication() {

    console.log(
        "DevOpsFlow frontend initialization started."
    );

    // 1. Initialize dashboard event listeners.
    initializeEventListeners();
    document.getElementById("refreshRenderBtn")
        ?.addEventListener("click", loadRenderDeployments);
    // 2. Initialize deployment controls immediately.
    // No API request is awaited before this step.
    initializeDeploymentControlCenter();

    // 3. Restore saved theme.
    initializeTheme();

    // 4. Load dashboard data.
    loadRenderDeployments();
    refreshDashboard();

    // 5. Automatic synchronization every 30 seconds.
    setInterval(() => {
        loadRenderDeployments();
        refreshDashboard();
    }, 30000);

    console.log(
        "DevOpsFlow frontend initialized successfully."
    );
}


// Works whether the script loads before or after DOM ready.
if (document.readyState === "loading") {

    document.addEventListener(
        "DOMContentLoaded",
        initializeApplication,
        { once: true }
    );

} else {

    initializeApplication();

}
