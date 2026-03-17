/**
 * Error Highlighting User Study — Main Application
 * 
 * Single-page application managing the entire study flow.
 */

/* ============================================================
   State Management
   ============================================================ */
const state = {
  participantId: null,
  counterbalanceGroup: null,
  currentPage: "welcome",
  consent: {},
  demographics: {},
  preStudy: {},
  // Task data
  conditionOrder: [],        // e.g. ["control", "treatment"]
  conditionA_tasks: [],      // task IDs for first condition
  conditionB_tasks: [],      // task IDs for second condition
  currentConditionIndex: 0,  // 0 = condition A, 1 = condition B
  currentTaskIndex: 0,       // 0 or 1 within current condition
  taskResults: {},            // keyed by task ID
  // NASA-TLX
  nasaTlx: { conditionA: {}, conditionB: {} },
  // Post-task
  postTask: {},
  // Interview
  interview: {},
  // Timing
  studyStartTime: null,
  pageStartTime: null,
  timestamps: {},
};

/* ============================================================
   Page Flow Definition
   ============================================================ */
const PAGE_FLOW = [
  "welcome",
  "info-sheet",
  "consent-form",
  "pre-study",
  "tutorial",
  "condA-task1",
  "condA-task2",
  "nasa-tlx-A",
  "break",
  "condB-task1",
  "condB-task2",
  "nasa-tlx-B",
  "post-task",
  "interview",
  "thank-you",
];

const TOTAL_PAGES = PAGE_FLOW.length;

function getPageIndex(pageId) {
  return PAGE_FLOW.indexOf(pageId);
}

function getProgress() {
  const idx = getPageIndex(state.currentPage);
  return Math.round(((idx + 1) / TOTAL_PAGES) * 100);
}

/* ============================================================
   Initialization
   ============================================================ */
document.addEventListener("DOMContentLoaded", () => {
  initFirebase();
  assignParticipant();
  renderPage("welcome");
  updateProgress();
});

function assignParticipant() {
  // Generate a unique participant ID
  state.participantId = "P" + Date.now().toString(36).toUpperCase();
  
  // Assign counterbalance group (round-robin based on localStorage counter)
  let counter = parseInt(localStorage.getItem("cb_counter") || "0");
  const groupIndex = counter % COUNTERBALANCE_GROUPS.length;
  const group = COUNTERBALANCE_GROUPS[groupIndex];
  
  state.counterbalanceGroup = group.groupId;
  state.conditionOrder = group.conditionOrder;
  state.conditionA_tasks = group.conditionA_tasks;
  state.conditionB_tasks = group.conditionB_tasks;
  
  localStorage.setItem("cb_counter", String(counter + 1));
  state.studyStartTime = Date.now();
  
  console.log(`Participant: ${state.participantId}, Group: ${group.groupId}`);
  console.log(`Condition order: ${state.conditionOrder.join(" → ")}`);
  console.log(`Condition A tasks: ${state.conditionA_tasks.join(", ")} (${state.conditionOrder[0]})`);
  console.log(`Condition B tasks: ${state.conditionB_tasks.join(", ")} (${state.conditionOrder[1]})`);
}

/* ============================================================
   Navigation
   ============================================================ */
function navigateTo(pageId) {
  // Record timing for current page
  if (state.pageStartTime) {
    const elapsed = Date.now() - state.pageStartTime;
    state.timestamps[state.currentPage] = (state.timestamps[state.currentPage] || 0) + elapsed;
  }
  
  state.currentPage = pageId;
  state.pageStartTime = Date.now();
  renderPage(pageId);
  updateProgress();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function updateProgress() {
  const pct = getProgress();
  const fill = document.getElementById("progress-fill");
  const label = document.getElementById("progress-label");
  if (fill) fill.style.width = pct + "%";
  if (label) label.textContent = `Step ${getPageIndex(state.currentPage) + 1} of ${TOTAL_PAGES}`;
}

/* ============================================================
   Page Renderer
   ============================================================ */
function renderPage(pageId) {
  // Hide all pages
  document.querySelectorAll(".study-page").forEach(p => p.classList.remove("active"));
  
  const container = document.getElementById("page-content");
  
  switch (pageId) {
    case "welcome": renderWelcome(container); break;
    case "info-sheet": renderInfoSheet(container); break;
    case "consent-form": renderConsentForm(container); break;
    case "pre-study": renderPreStudy(container); break;
    case "tutorial": renderTutorial(container); break;
    case "condA-task1": renderTask(container, 0, 0); break;
    case "condA-task2": renderTask(container, 0, 1); break;
    case "nasa-tlx-A": renderNasaTlx(container, "conditionA"); break;
    case "break": renderBreak(container); break;
    case "condB-task1": renderTask(container, 1, 0); break;
    case "condB-task2": renderTask(container, 1, 1); break;
    case "nasa-tlx-B": renderNasaTlx(container, "conditionB"); break;
    case "post-task": renderPostTask(container); break;
    case "interview": renderInterview(container); break;
    case "thank-you": renderThankYou(container); break;
  }
}

/* ============================================================
   Welcome Page
   ============================================================ */
function renderWelcome(c) {
  c.innerHTML = `
    <div class="study-page active" id="pg-welcome">
      <div class="card" style="text-align:center; padding:3rem 2rem;">
        <h2 style="font-size:1.6rem; margin-bottom:0.5rem;">Welcome to the User Study</h2>
        <p style="color:var(--text-secondary); margin-bottom:0.5rem;">
          Investigating the Effect of Error Highlighting on User Trust<br>
          in LLM-Generated Plans
        </p>
        <div class="cambridge-badge" style="margin:0.75rem auto;">
          🎓 Department of Engineering, University of Cambridge
        </div>
        <p class="info-text" style="max-width:520px; margin:1.5rem auto 0;">
          Thank you for your interest in this study. The entire session will take approximately
          <strong>15 minutes</strong>. You will review and edit plans generated by an AI assistant,
          then answer a few questionnaires.
        </p>
        <div class="btn-group center" style="margin-top:2rem;">
          <button class="btn btn-primary" onclick="navigateTo('info-sheet')">
            Begin → 
          </button>
        </div>
        <p class="info-text" style="margin-top:1rem; font-size:0.78rem;">
          Participant ID: <code style="font-family:var(--font-mono);">${state.participantId}</code>
        </p>
      </div>
    </div>`;
}

/* ============================================================
   Participant Information Sheet
   ============================================================ */
function renderInfoSheet(c) {
  c.innerHTML = `
    <div class="study-page active" id="pg-info-sheet">
      <div class="card">
        <h2>Participant Information Sheet</h2>
        <p class="info-text" style="margin-bottom:1rem;">
          Please read the following information carefully before deciding whether to take part.
        </p>
        <div class="scrollable-content" id="info-scroll">
          <h4>Purpose of the Study</h4>
          <p>This study aims to evaluate whether error highlighting in AI-generated plans can help users better identify mistakes, calibrate their trust, and improve the quality of edited plans. The findings will contribute to our understanding of human-AI collaboration with Large Language Model (LLM) agents.</p>
          
          <h4>1. Why have I been chosen?</h4>
          <p>You have been invited because you have prior experience using large language model-based tools (e.g., ChatGPT). This ensures you can meaningfully engage with the task of reviewing and editing LLM-generated plans.</p>
          
          <h4>2. Do I have to take part?</h4>
          <p>No, participation is entirely voluntary. If you do decide to take part, you can still withdraw from the study at any time, without giving any reasons.</p>
          
          <h4>3. Who is organising the study?</h4>
          <p>This study is being conducted as part of the MLMI16 module at the Department of Engineering, University of Cambridge. The principal investigator is Dr John Dudley.</p>
          
          <h4>4. What will happen during the study?</h4>
          <p>You will first complete a short demographic questionnaire. Then you will review and edit four AI-generated plans for everyday tasks (e.g., setting alarms, booking flights). In some cases, potential errors in the plan will be visually highlighted. After each pair of tasks, you will complete a short workload questionnaire. Finally, you will answer some questions about your experience.</p>
          
          <h4>5. What are the possible risks of taking part?</h4>
          <p>This study poses minimal risk. All tasks are simulated scenarios with no real consequences. The session lasts approximately 15 minutes. Should you feel uncomfortable at any point, you may end the experiment at any time.</p>
          
          <h4>6. What happens at the end of the study?</h4>
          <p>At the end of the study, there will be a chance for you to ask any questions you may have.</p>
          
          <h4>7. What will happen to the study results?</h4>
          <p>The anonymised results will be written up and submitted as part of a coursework report. Results may also be presented at research meetings.</p>
          
          <h4>8. Anonymity — will I be identified in any publication?</h4>
          <p>The data will be anonymised and any references to the data will be done so that you are not identifiable.</p>
          
          <h4>9. What if there is a problem?</h4>
          <p>If you have a concern about any aspect of this study, you should ask to speak to the researcher(s) who will do their best to answer your questions.</p>
          
          <h4>10. Who has reviewed the study?</h4>
          <p>The Department of Engineering Ethics Committee has reviewed this study through the light-touch review process.</p>
        </div>
        <div class="btn-group center">
          <button class="btn btn-secondary" onclick="navigateTo('welcome')">← Back</button>
          <button class="btn btn-primary" onclick="navigateTo('consent-form')">Continue →</button>
        </div>
      </div>
    </div>`;
}

/* ============================================================
   Consent Form
   ============================================================ */
function renderConsentForm(c) {
  const items = [
    "I confirm that I have read and understand the Participant Information Sheet.",
    "I have had the opportunity to ask questions and have had these answered satisfactorily.",
    "I understand that my participation is voluntary and that I am free to withdraw at any time without giving a reason.",
    "I agree that data gathered in this study may be stored anonymously and securely, and may be used for future research.",
    "I agree that my anonymised responses may be included in a coursework report and potentially presented at research meetings.",
    "I agree to take part in this study.",
  ];

  c.innerHTML = `
    <div class="study-page active" id="pg-consent">
      <div class="card">
        <h2>Participant Consent Form</h2>
        <p class="info-text" style="margin-bottom:1.25rem;">
          Please tick <strong>all</strong> boxes to confirm your consent before proceeding.
        </p>
        <div id="consent-items">
          ${items.map((text, i) => `
            <div class="consent-item">
              <input type="checkbox" id="consent-${i}" onchange="checkConsent()">
              <span>${i + 1}. ${text}</span>
            </div>
          `).join("")}
        </div>
        <p class="validation-error" id="consent-error">
          Please confirm all items to proceed.
        </p>
        <div class="btn-group center">
          <button class="btn btn-secondary" onclick="navigateTo('info-sheet')">← Back</button>
          <button class="btn btn-primary" id="consent-btn" disabled onclick="submitConsent()">
            I Consent — Continue →
          </button>
        </div>
      </div>
    </div>`;
}

function checkConsent() {
  const boxes = document.querySelectorAll('#consent-items input[type="checkbox"]');
  const allChecked = Array.from(boxes).every(b => b.checked);
  document.getElementById("consent-btn").disabled = !allChecked;
  if (allChecked) document.getElementById("consent-error").classList.remove("visible");
}

function submitConsent() {
  state.consent = { consented: true, timestamp: new Date().toISOString() };
  saveToFirebase(state.participantId, { consent: state.consent, counterbalanceGroup: state.counterbalanceGroup });
  navigateTo("pre-study");
}

/* ============================================================
   Pre-Study Questionnaire
   ============================================================ */
function renderPreStudy(c) {
  c.innerHTML = `
    <div class="study-page active" id="pg-prestudy">
      <div class="card">
        <h2>Pre-Study Questionnaire</h2>
        <p class="info-text" style="margin-bottom:1.5rem;">
          Please answer the following questions about your background and experience.
        </p>

        <div class="form-group">
          <label>Age Range <span class="required-star">*</span></label>
          <div class="radio-group">
            ${["18–24", "25–34", "35–44", "45–54", "55+"].map(v => `
              <label class="radio-option">
                <input type="radio" name="age" value="${v}"> ${v}
              </label>
            `).join("")}
          </div>
        </div>

        <div class="form-group">
          <label>Gender <span class="required-star">*</span></label>
          <div class="radio-group">
            ${["Male", "Female", "Non-binary", "Prefer not to say"].map(v => `
              <label class="radio-option">
                <input type="radio" name="gender" value="${v}"> ${v}
              </label>
            `).join("")}
          </div>
        </div>

        <div class="form-group">
          <label>Highest Level of Education <span class="required-star">*</span></label>
          <div class="radio-group">
            ${["Undergraduate", "Master's degree", "Doctoral degree", "Other"].map(v => `
              <label class="radio-option">
                <input type="radio" name="education" value="${v}"> ${v}
              </label>
            `).join("")}
          </div>
        </div>

        <hr class="divider">

        <div class="form-group">
          <label>How often do you use LLM-based tools (e.g., ChatGPT, Claude)? <span class="required-star">*</span></label>
          <div class="radio-group">
            ${["Daily", "Several times a week", "Once a week", "A few times a month", "Rarely"].map(v => `
              <label class="radio-option">
                <input type="radio" name="llm_freq" value="${v}"> ${v}
              </label>
            `).join("")}
          </div>
        </div>

        <div class="form-group">
          <label>How would you rate your familiarity with LLM-generated outputs? <span class="required-star">*</span></label>
          <div class="radio-group">
            ${["Very familiar — I regularly evaluate and edit LLM outputs",
              "Somewhat familiar — I use LLMs but don't closely scrutinise outputs",
              "Slightly familiar — I have limited experience",
              "Not familiar — I have almost no experience"].map(v => `
              <label class="radio-option">
                <input type="radio" name="llm_familiarity" value="${v}"> ${v}
              </label>
            `).join("")}
          </div>
        </div>

        <div class="form-group">
          <label>In general, how much do you trust AI systems to provide accurate information? <span class="required-star">*</span></label>
          <div class="likert-container" style="background:transparent; padding:0;">
            <div class="likert-scale">
              ${[1,2,3,4,5,6,7].map(v => `
                <label>
                  <input type="radio" name="ai_trust" value="${v}">
                  ${v}
                </label>
              `).join("")}
            </div>
            <div class="likert-endpoints">
              <span>1 — Not at all</span>
              <span>7 — Completely</span>
            </div>
          </div>
        </div>

        <p class="validation-error" id="prestudy-error">Please answer all required questions.</p>
        <div class="btn-group center">
          <button class="btn btn-secondary" onclick="navigateTo('consent-form')">← Back</button>
          <button class="btn btn-primary" onclick="submitPreStudy()">Continue →</button>
        </div>
      </div>
    </div>`;
}

function submitPreStudy() {
  const required = ["age", "gender", "education", "llm_freq", "llm_familiarity", "ai_trust"];
  const data = {};
  let valid = true;
  
  for (const name of required) {
    const el = document.querySelector(`input[name="${name}"]:checked`);
    if (!el) { valid = false; break; }
    data[name] = el.value;
  }
  
  if (!valid) {
    document.getElementById("prestudy-error").classList.add("visible");
    return;
  }
  
  state.demographics = data;
  saveToFirebase(state.participantId, { demographics: data });
  navigateTo("tutorial");
}

/* ============================================================
   Tutorial
   ============================================================ */
function renderTutorial(c) {
  c.innerHTML = `
    <div class="study-page active" id="pg-tutorial">
      <div class="card">
        <h2>Tutorial: How the Study Works</h2>
        <div class="tutorial-highlight">
          <span class="icon">💡</span>
          <strong>Please read this carefully before starting the main tasks.</strong>
        </div>
        
        <h3>The Plan-Then-Execute Framework</h3>
        <p>In this study, you will act as a user collaborating with an AI daily assistant (LLM agent). The assistant generates <strong>step-wise plans</strong> for everyday tasks (like setting alarms or booking flights). Your job is to <strong>review</strong> the plan, <strong>edit</strong> any errors you find, and then indicate whether you <strong>trust</strong> the plan to produce a correct outcome.</p>
        
        <hr class="divider">
        
        <h3>What You'll Do for Each Task</h3>
        <p><strong>1. Read the task description</strong> — understand what the AI assistant is supposed to accomplish.</p>
        <p><strong>2. Review the AI-generated plan</strong> — look at each step carefully. The plan may contain errors.</p>
        <p><strong>3. Edit the plan</strong> — you can click on any step to edit its text, delete unnecessary steps, or add new steps.</p>
        <p><strong>4. Make a trust judgment</strong> — after editing, indicate whether you trust the (edited) plan to execute correctly.</p>
        <p><strong>5. See the execution result</strong> — the assistant will automatically execute the plan and show you the outcome.</p>
        
        <hr class="divider">
        
        <h3>About Error Highlighting</h3>
        <p>In some tasks, you may see steps marked with a <span class="error-icon" style="display:inline-flex; vertical-align:middle;">⚠</span> warning icon and a <span style="border-left:4px solid var(--error-highlight); padding-left:6px; background:var(--error-highlight-bg); display:inline; padding:2px 6px; border-radius:3px;">red border</span>. These visual indicators suggest that the step <em>may</em> contain an error. However:</p>
        <div class="tutorial-highlight">
          <strong>Important:</strong> The highlighting is not perfect — it may miss some errors, and highlighted steps may not always be wrong. Always review <em>all</em> steps carefully, whether or not they are highlighted.
        </div>
        
        <hr class="divider">
        
        <h3>Editing Controls</h3>
        <p>When you hover over a plan step, you'll see edit buttons:</p>
        <p>✏️ <strong>Edit</strong> — modify the step text &nbsp;&nbsp; 🗑️ <strong>Delete</strong> — remove the step &nbsp;&nbsp; ➕ <strong>Add</strong> — insert a new step below</p>
        
        <div class="btn-group center" style="margin-top:2rem;">
          <button class="btn btn-primary" onclick="startMainTasks()">
            I understand — Start the study →
          </button>
        </div>
      </div>
    </div>`;
}

function startMainTasks() {
  navigateTo("condA-task1");
}

/* ============================================================
   Task Rendering
   ============================================================ */
function getTaskData(conditionIndex, taskIndex) {
  const taskIds = conditionIndex === 0 ? state.conditionA_tasks : state.conditionB_tasks;
  const taskId = taskIds[taskIndex];
  const task = TASKS.find(t => t.id === taskId);
  const condition = state.conditionOrder[conditionIndex];
  return { task, condition, taskId };
}

function renderTask(c, conditionIndex, taskIndex) {
  const { task, condition, taskId } = getTaskData(conditionIndex, taskIndex);
  const pageKey = conditionIndex === 0 
    ? (taskIndex === 0 ? "condA-task1" : "condA-task2")
    : (taskIndex === 0 ? "condB-task1" : "condB-task2");
  
  // Initialize task result tracking
  if (!state.taskResults[taskId]) {
    state.taskResults[taskId] = {
      condition,
      taskId,
      risk: task.risk,
      edits: [],
      editedPlan: null,
      trustJudgment: null,
      startTime: Date.now(),
      endTime: null,
      stepInteractions: {},
    };
  }

  const condLabel = condition === "treatment" ? "With Error Highlighting" : "Without Error Highlighting";
  const condNum = conditionIndex === 0 ? "A" : "B";
  const taskNum = conditionIndex * 2 + taskIndex + 1;

  c.innerHTML = `
    <div class="study-page active" id="pg-task-${taskId}">
      <div class="card">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1rem;">
          <h2 style="margin-bottom:0;">Task ${taskNum} of 4</h2>
          <span class="condition-badge">${condLabel}</span>
        </div>
        
        <div class="task-briefing">
          <div class="task-label">
            ${task.domain} Task
            <span class="risk-badge ${task.risk}">${task.risk} risk</span>
          </div>
          <p style="margin-top:0.5rem; font-size:0.95rem;">"${task.description}"</p>
        </div>
        
        <div class="plan-container" id="plan-${taskId}">
          <div class="plan-header">
            <h3>AI-Generated Plan</h3>
            <button class="btn btn-small btn-secondary" onclick="addTopLevelStep('${taskId}')">+ Add Step</button>
          </div>
          <div class="plan-steps" id="plan-steps-${taskId}">
            ${renderPlanSteps(task.plan, condition, taskId)}
          </div>
        </div>
        
        <div class="trust-judgment" id="trust-${taskId}">
          <p>Do you trust this plan (as edited) to produce the correct execution result?</p>
          <div class="trust-buttons">
            <button class="trust-btn yes" onclick="submitTrust('${taskId}', true, '${pageKey}', ${conditionIndex}, ${taskIndex})">
              👍 Yes, I trust it
            </button>
            <button class="trust-btn no" onclick="submitTrust('${taskId}', false, '${pageKey}', ${conditionIndex}, ${taskIndex})">
              👎 No, I don't trust it
            </button>
          </div>
        </div>
        
        <div id="execution-${taskId}" class="hidden">
          <div class="execution-result success">
            <h4>✅ Execution Result</h4>
            <p>${task.executionResult.summary}</p>
          </div>
          <div class="btn-group center">
            <button class="btn btn-primary" id="next-btn-${taskId}">Continue →</button>
          </div>
        </div>
      </div>
    </div>`;
}

function renderPlanSteps(steps, condition, taskId, depth = 0) {
  let html = "";
  for (const step of steps) {
    const depthClass = depth === 0 ? "primary" : depth === 1 ? "sub" : "sub-sub";
    const isHighlighted = condition === "treatment" && step.hasHighlightedError;
    const highlightClass = isHighlighted ? "error-highlighted" : "";
    
    html += `
      <div class="plan-step ${depthClass} ${highlightClass}" data-step-id="${step.id}" data-task-id="${taskId}">
        <div class="plan-step-content">
          ${isHighlighted ? '<span class="error-icon">⚠</span>' : ""}
          <span class="plan-step-text">${step.text}</span>
          <div class="plan-step-actions">
            <button onclick="editStep('${taskId}', '${step.id}')" title="Edit">✏️</button>
            <button onclick="deleteStep('${taskId}', '${step.id}')" title="Delete">🗑️</button>
            <button onclick="addStepBelow('${taskId}', '${step.id}')" title="Add below">➕</button>
          </div>
        </div>
      </div>`;
    
    if (step.children) {
      html += renderPlanSteps(step.children, condition, taskId, depth + 1);
    }
  }
  return html;
}

/* ============================================================
   Plan Editing Operations
   ============================================================ */
function editStep(taskId, stepId) {
  const stepEl = document.querySelector(`[data-step-id="${stepId}"][data-task-id="${taskId}"]`);
  if (!stepEl || stepEl.classList.contains("editing")) return;
  
  const textEl = stepEl.querySelector(".plan-step-text");
  const currentText = textEl.textContent;
  
  stepEl.classList.add("editing");
  
  const input = document.createElement("input");
  input.type = "text";
  input.className = "edit-input";
  input.value = currentText;
  
  const saveBtn = document.createElement("button");
  saveBtn.className = "btn btn-small btn-primary";
  saveBtn.textContent = "Save";
  saveBtn.style.marginLeft = "0.5rem";
  
  const cancelBtn = document.createElement("button");
  cancelBtn.className = "btn btn-small btn-secondary";
  cancelBtn.textContent = "Cancel";
  cancelBtn.style.marginLeft = "0.25rem";
  
  const actionsEl = stepEl.querySelector(".plan-step-actions");
  actionsEl.style.display = "none";
  
  const container = stepEl.querySelector(".plan-step-content");
  container.appendChild(input);
  container.appendChild(saveBtn);
  container.appendChild(cancelBtn);
  
  input.focus();
  
  const finish = (save) => {
    if (save && input.value.trim() !== currentText.trim()) {
      textEl.textContent = input.value.trim();
      logEdit(taskId, stepId, "edit", currentText, input.value.trim());
    }
    stepEl.classList.remove("editing");
    input.remove();
    saveBtn.remove();
    cancelBtn.remove();
    actionsEl.style.display = "";
  };
  
  saveBtn.onclick = () => finish(true);
  cancelBtn.onclick = () => finish(false);
  input.addEventListener("keydown", e => {
    if (e.key === "Enter") finish(true);
    if (e.key === "Escape") finish(false);
  });
}

function deleteStep(taskId, stepId) {
  const stepEl = document.querySelector(`[data-step-id="${stepId}"][data-task-id="${taskId}"]`);
  if (!stepEl) return;
  
  const text = stepEl.querySelector(".plan-step-text").textContent;
  stepEl.style.transition = "opacity 0.2s, max-height 0.3s";
  stepEl.style.opacity = "0";
  stepEl.style.maxHeight = "0";
  stepEl.style.overflow = "hidden";
  stepEl.style.padding = "0";
  stepEl.style.margin = "0";
  
  setTimeout(() => stepEl.remove(), 300);
  logEdit(taskId, stepId, "delete", text, null);
}

function addStepBelow(taskId, stepId) {
  const stepEl = document.querySelector(`[data-step-id="${stepId}"][data-task-id="${taskId}"]`);
  if (!stepEl) return;
  
  const newId = "new-" + Date.now();
  const newStep = document.createElement("div");
  newStep.className = "plan-step sub";
  newStep.dataset.stepId = newId;
  newStep.dataset.taskId = taskId;
  newStep.innerHTML = `
    <div class="plan-step-content">
      <span class="plan-step-text">(New step — click edit to change)</span>
      <div class="plan-step-actions">
        <button onclick="editStep('${taskId}', '${newId}')" title="Edit">✏️</button>
        <button onclick="deleteStep('${taskId}', '${newId}')" title="Delete">🗑️</button>
        <button onclick="addStepBelow('${taskId}', '${newId}')" title="Add below">➕</button>
      </div>
    </div>`;
  
  stepEl.after(newStep);
  logEdit(taskId, newId, "add", null, "(New step)");
  
  // Auto-start editing
  setTimeout(() => editStep(taskId, newId), 100);
}

function addTopLevelStep(taskId) {
  const container = document.getElementById(`plan-steps-${taskId}`);
  const newId = "new-" + Date.now();
  const newStep = document.createElement("div");
  newStep.className = "plan-step primary";
  newStep.dataset.stepId = newId;
  newStep.dataset.taskId = taskId;
  newStep.innerHTML = `
    <div class="plan-step-content">
      <span class="plan-step-text">(New primary step — click edit to change)</span>
      <div class="plan-step-actions">
        <button onclick="editStep('${taskId}', '${newId}')" title="Edit">✏️</button>
        <button onclick="deleteStep('${taskId}', '${newId}')" title="Delete">🗑️</button>
        <button onclick="addStepBelow('${taskId}', '${newId}')" title="Add below">➕</button>
      </div>
    </div>`;
  container.appendChild(newStep);
  logEdit(taskId, newId, "add", null, "(New primary step)");
  setTimeout(() => editStep(taskId, newId), 100);
}

function logEdit(taskId, stepId, action, oldText, newText) {
  if (!state.taskResults[taskId]) return;
  state.taskResults[taskId].edits.push({
    stepId, action, oldText, newText, timestamp: Date.now(),
  });
}

/* ============================================================
   Trust Judgment & Task Completion
   ============================================================ */
function submitTrust(taskId, trusted, pageKey, conditionIndex, taskIndex) {
  // Highlight selected button
  const btns = document.querySelectorAll(`#trust-${taskId} .trust-btn`);
  btns.forEach(b => b.classList.remove("selected"));
  if (trusted) {
    btns[0].classList.add("selected");
  } else {
    btns[1].classList.add("selected");
  }
  
  // Collect final plan state
  const planSteps = [];
  document.querySelectorAll(`[data-task-id="${taskId}"]`).forEach(el => {
    const text = el.querySelector(".plan-step-text");
    if (text) planSteps.push({ stepId: el.dataset.stepId, text: text.textContent.trim() });
  });
  
  state.taskResults[taskId].trustJudgment = trusted;
  state.taskResults[taskId].editedPlan = planSteps;
  state.taskResults[taskId].endTime = Date.now();
  state.taskResults[taskId].duration = state.taskResults[taskId].endTime - state.taskResults[taskId].startTime;
  
  // Show execution result
  document.getElementById(`execution-${taskId}`).classList.remove("hidden");
  
  // Determine next page
  const nextBtn = document.getElementById(`next-btn-${taskId}`);
  let nextPage;
  
  if (conditionIndex === 0 && taskIndex === 0) nextPage = "condA-task2";
  else if (conditionIndex === 0 && taskIndex === 1) nextPage = "nasa-tlx-A";
  else if (conditionIndex === 1 && taskIndex === 0) nextPage = "condB-task2";
  else nextPage = "nasa-tlx-B";
  
  nextBtn.onclick = () => {
    saveToFirebase(state.participantId, { taskResults: state.taskResults });
    navigateTo(nextPage);
  };
  
  // Scroll to execution result
  document.getElementById(`execution-${taskId}`).scrollIntoView({ behavior: "smooth" });
}

/* ============================================================
   NASA-TLX
   ============================================================ */
function renderNasaTlx(c, conditionKey) {
  const condLabel = conditionKey === "conditionA" 
    ? state.conditionOrder[0] 
    : state.conditionOrder[1];
  const condDisplay = condLabel === "treatment" ? "With Error Highlighting" : "Without Error Highlighting";

  c.innerHTML = `
    <div class="study-page active" id="pg-nasa-${conditionKey}">
      <div class="card">
        <h2>Workload Assessment (NASA-TLX)</h2>
        <p class="info-text" style="margin-bottom:0.5rem;">
          Please rate the workload you experienced during the <strong>previous two tasks</strong>.
        </p>
        <p style="margin-bottom:1.5rem;">
          <span class="condition-badge">${condDisplay}</span>
        </p>
        
        ${NASA_TLX_SCALES.map(scale => `
          <div class="slider-container">
            <div class="slider-label">${scale.label}</div>
            <div class="slider-description">${scale.description}</div>
            <input type="range" min="0" max="100" value="50" step="5"
                   id="tlx-${conditionKey}-${scale.id}"
                   oninput="document.getElementById('val-${conditionKey}-${scale.id}').textContent = this.value">
            <div class="slider-endpoints">
              <span>${scale.lowEnd}</span>
              <span>${scale.highEnd}</span>
            </div>
            <div class="slider-value" id="val-${conditionKey}-${scale.id}">50</div>
          </div>
        `).join("")}
        
        <div class="btn-group center">
          <button class="btn btn-primary" onclick="submitNasaTlx('${conditionKey}')">Continue →</button>
        </div>
      </div>
    </div>`;
}

function submitNasaTlx(conditionKey) {
  const data = {};
  NASA_TLX_SCALES.forEach(scale => {
    const el = document.getElementById(`tlx-${conditionKey}-${scale.id}`);
    data[scale.id] = parseInt(el.value);
  });
  state.nasaTlx[conditionKey] = data;
  saveToFirebase(state.participantId, { nasaTlx: state.nasaTlx });
  
  if (conditionKey === "conditionA") {
    navigateTo("break");
  } else {
    navigateTo("post-task");
  }
}

/* ============================================================
   Break Screen
   ============================================================ */
function renderBreak(c) {
  c.innerHTML = `
    <div class="study-page active" id="pg-break">
      <div class="card break-screen">
        <h2>Short Break</h2>
        <p style="color:var(--text-secondary);">
          You have completed the first half. Take a moment to rest before continuing.
        </p>
        <div class="timer" id="break-timer">1:00</div>
        <p class="info-text">You can continue whenever you're ready.</p>
        <div class="btn-group center" style="margin-top:1.5rem;">
          <button class="btn btn-primary" id="break-continue-btn" onclick="navigateTo('condB-task1')">
            Continue to Next Section →
          </button>
        </div>
      </div>
    </div>`;
  
  // Countdown timer (optional visual)
  let seconds = 60;
  const timerEl = document.getElementById("break-timer");
  const interval = setInterval(() => {
    seconds--;
    if (seconds <= 0) {
      clearInterval(interval);
      timerEl.textContent = "0:00";
      return;
    }
    timerEl.textContent = `0:${seconds.toString().padStart(2, "0")}`;
  }, 1000);
}

/* ============================================================
   Post-Task Questionnaire
   ============================================================ */
function renderPostTask(c) {
  c.innerHTML = `
    <div class="study-page active" id="pg-posttask">
      <div class="card">
        <h2>Post-Task Questionnaire</h2>
        <p class="info-text" style="margin-bottom:1.5rem;">
          Please rate the following statements based on your experience during the study.
          <br><em>(1 = Strongly Disagree, 7 = Strongly Agree)</em>
        </p>
        
        ${POST_TASK_QUESTIONS.map(q => `
          <div class="likert-container">
            <div class="likert-question">${q.text}</div>
            <div class="likert-scale">
              ${[1,2,3,4,5,6,7].map(v => `
                <label>
                  <input type="radio" name="post-${q.id}" value="${v}">
                  ${v}
                </label>
              `).join("")}
            </div>
            <div class="likert-endpoints">
              <span>Strongly Disagree</span>
              <span>Strongly Agree</span>
            </div>
          </div>
        `).join("")}
        
        <p class="validation-error" id="posttask-error">Please answer all questions.</p>
        <div class="btn-group center">
          <button class="btn btn-primary" onclick="submitPostTask()">Continue →</button>
        </div>
      </div>
    </div>`;
}

function submitPostTask() {
  const data = {};
  let valid = true;
  
  POST_TASK_QUESTIONS.forEach(q => {
    const el = document.querySelector(`input[name="post-${q.id}"]:checked`);
    if (!el) { valid = false; return; }
    data[q.id] = parseInt(el.value);
  });
  
  if (!valid) {
    document.getElementById("posttask-error").classList.add("visible");
    return;
  }
  
  state.postTask = data;
  saveToFirebase(state.participantId, { postTask: data });
  navigateTo("interview");
}

/* ============================================================
   Semi-Structured Interview (Open-Ended)
   ============================================================ */
function renderInterview(c) {
  c.innerHTML = `
    <div class="study-page active" id="pg-interview">
      <div class="card">
        <h2>Feedback Questions</h2>
        <p class="info-text" style="margin-bottom:1.5rem;">
          Please share your thoughts in as much detail as you are comfortable with.
          There are no right or wrong answers.
        </p>
        
        ${INTERVIEW_QUESTIONS.map(q => `
          <div class="form-group">
            <label>${q.text}</label>
            <textarea id="interview-${q.id}" rows="4" 
                      placeholder="Type your response here..."></textarea>
          </div>
        `).join("")}
        
        <div class="btn-group center">
          <button class="btn btn-primary" onclick="submitInterview()">Submit & Finish →</button>
        </div>
      </div>
    </div>`;
}

function submitInterview() {
  const data = {};
  INTERVIEW_QUESTIONS.forEach(q => {
    const el = document.getElementById(`interview-${q.id}`);
    data[q.id] = el ? el.value.trim() : "";
  });
  
  state.interview = data;
  
  // Save all final data
  const finalData = {
    participantId: state.participantId,
    counterbalanceGroup: state.counterbalanceGroup,
    conditionOrder: state.conditionOrder,
    consent: state.consent,
    demographics: state.demographics,
    taskResults: state.taskResults,
    nasaTlx: state.nasaTlx,
    postTask: state.postTask,
    interview: state.interview,
    timestamps: state.timestamps,
    totalDuration: Date.now() - state.studyStartTime,
    completedAt: new Date().toISOString(),
  };
  
  saveToFirebase(state.participantId, finalData);
  navigateTo("thank-you");
}

/* ============================================================
   Thank You
   ============================================================ */
function renderThankYou(c) {
  c.innerHTML = `
    <div class="study-page active" id="pg-thankyou">
      <div class="card thank-you">
        <div class="checkmark">✅</div>
        <h2>Thank You!</h2>
        <p style="color:var(--text-secondary); max-width:480px; margin:0.75rem auto 1.5rem;">
          Your responses have been recorded successfully. Thank you for participating in this study.
          Your contribution is greatly appreciated.
        </p>
        <p class="info-text" style="margin-bottom:1.5rem;">
          Participant ID: <code style="font-family:var(--font-mono);">${state.participantId}</code>
          <br>Duration: <code>${Math.round((Date.now() - state.studyStartTime) / 60000)} minutes</code>
        </p>
        <div class="card" style="text-align:left; background:var(--info-bg); border-color:#bdd4f0; max-width:500px; margin:0 auto;">
          <h3 style="font-size:1rem;">Debrief</h3>
          <p style="font-size:0.88rem; color:var(--text-secondary);">
            This study examined whether visually highlighting potential errors in AI-generated plans
            helps users identify mistakes and calibrate their trust appropriately. In the treatment condition,
            some (but not all) errors were highlighted — we were also interested in whether highlighting
            might cause participants to overlook non-highlighted errors (a complacency effect).
          </p>
          <p style="font-size:0.88rem; color:var(--text-secondary); margin-top:0.5rem;">
            If you have any questions or concerns, please contact the research team at the
            Department of Engineering, University of Cambridge.
          </p>
        </div>
        <div class="btn-group center" style="margin-top:1.5rem;">
          <button class="btn btn-secondary" onclick="downloadLocalData()">
            📥 Download My Data (Backup)
          </button>
        </div>
      </div>
    </div>`;
}
