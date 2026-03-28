(async function () {
  const me = await window.Auth.requireAppAccess();
  if (!me) return;

  const params = new URLSearchParams(window.location.search);
  const flowId = params.get("id");

  const builderMeta = document.getElementById("builderMeta");
  const flowIdBadge = document.getElementById("flowIdBadge");
  const autosaveBadge = document.getElementById("autosaveBadge");
  const lastSavedBadge = document.getElementById("lastSavedBadge");
  const definitionInput = document.getElementById("definitionInput");
  const resultBox = document.getElementById("resultBox");
  const historyList = document.getElementById("historyList");

  const summaryAction = document.getElementById("summaryAction");
  const summaryStatus = document.getElementById("summaryStatus");
  const summaryExecution = document.getElementById("summaryExecution");
  const summaryFlow = document.getElementById("summaryFlow");

  const saveBuilderBtn = document.getElementById("saveBuilderBtn");
  const saveDraftBtn = document.getElementById("saveDraftBtn");
  const validateBtn = document.getElementById("validateBtn");
  const previewBtn = document.getElementById("previewBtn");
  const runBtn = document.getElementById("runBtn");
  const logoutBtn = document.getElementById("logoutBtn");

  const presetBlankBtn = document.getElementById("presetBlankBtn");
  const presetHelloBtn = document.getElementById("presetHelloBtn");
  const presetIfBtn = document.getElementById("presetIfBtn");
  const formatJsonBtn = document.getElementById("formatJsonBtn");
  const reloadHistoryBtn = document.getElementById("reloadHistoryBtn");

  let autosaveTimer = null;
  let executionHistory = [];

  if (!flowId) {
    resultBox.textContent = "Thiếu flow id";
    return;
  }

  flowIdBadge.textContent = `Flow #${flowId}`;
  summaryFlow.textContent = String(flowId);

  const presets = {
    blank: {
      nodes: [],
      edges: []
    },
    hello: {
      nodes: [
        { id: "trigger", type: "manual" },
        { id: "set", type: "transform", data: { text: "Xin chào Nhà Chung" } },
        { id: "output", type: "response" }
      ],
      edges: [
        { from: "trigger", to: "set" },
        { from: "set", to: "output" }
      ]
    },
    ifflow: {
      nodes: [
        { id: "trigger", type: "manual" },
        { id: "check", type: "if", data: { test: true } },
        { id: "output", type: "response" }
      ],
      edges: [
        { from: "trigger", to: "check" },
        { from: "check", to: "output" }
      ]
    }
  };

  function formatTime(ts) {
    if (!ts) return "-";
    return new Date(ts).toLocaleString("vi-VN");
  }

  function setAutosave(text) {
    if (autosaveBadge) {
      autosaveBadge.textContent = `Autosave: ${text}`;
    }
  }

  function setLastSaved(ts) {
    if (lastSavedBadge) {
      lastSavedBadge.textContent = `Lần lưu cuối: ${ts ? formatTime(ts) : "-"}`;
    }
  }

  function safeParse() {
    try {
      return {
        ok: true,
        data: JSON.parse(definitionInput.value)
      };
    } catch (e) {
      return {
        ok: false,
        error: e.message
      };
    }
  }

  function setJsonToEditor(data) {
    definitionInput.value = JSON.stringify(data, null, 2);
  }

  function setSummary(action, status, executionId) {
    summaryAction.textContent = action || "-";
    summaryStatus.textContent = status || "-";
    summaryExecution.textContent = executionId ? String(executionId) : "-";
    summaryFlow.textContent = String(flowId);
  }

  function setResult(data) {
    resultBox.textContent = JSON.stringify(data, null, 2);
  }

  function deriveStatus(payload) {
    if (payload?.execution?.data?.status) return payload.execution.data.status;
    if (payload?.run?.data?.status) return payload.run.data.status;
    if (payload?.result?.data?.valid === true) return "success";
    if (payload?.result?.data?.valid === false) return "invalid";
    if (payload?.error) return "error";
    return "ok";
  }

  function setResultAndSummary(action, payload) {
    const executionId =
      payload?.execution?.data?.id ||
      payload?.run?.data?.execution_id ||
      payload?.result?.data?.execution_id ||
      null;

    const status = deriveStatus(payload);

    setSummary(action, status, executionId);
    setResult(payload);
  }

  function renderHistory() {
    if (!historyList) return;

    if (!executionHistory.length) {
      historyList.innerHTML = '<p class="muted">Chưa có execution nào trong phiên hiện tại.</p>';
      return;
    }

    historyList.innerHTML = executionHistory
      .slice()
      .reverse()
      .map((item) => `
        <article class="list-item compact-item">
          <div>
            <strong>Execution #${item.id}</strong>
            <div class="list-meta">Status: ${item.status}</div>
            <div class="list-meta">Time: ${formatTime(item.created_at)}</div>
          </div>
          <div class="row-actions">
            <button class="btn btn-secondary history-view-btn" data-execution-id="${item.id}">
              Xem
            </button>
          </div>
        </article>
      `)
      .join("");

    historyList.querySelectorAll(".history-view-btn").forEach((button) => {
      button.addEventListener("click", async () => {
        const executionId = button.dataset.executionId;
        if (!executionId) return;

        try {
          const execution = await window.API.get(`/executions/${executionId}`);
          setResultAndSummary("history_view", { execution });
        } catch (err) {
          setResultAndSummary("history_view", { error: err.message });
        }
      });
    });
  }

  async function saveDraftAuto() {
    const parsed = safeParse();
    if (!parsed.ok) {
      setAutosave("invalid json");
      return;
    }

    try {
      setAutosave("saving...");
      const res = await window.API.post(`/flows/${flowId}/drafts`, {
        draft_json: parsed.data
      });

      const ts = Date.now();
      setAutosave("saved");
      setLastSaved(ts);

      setResultAndSummary("autosave", {
        autosave: true,
        saved_at: ts,
        result: res
      });
    } catch (err) {
      setAutosave("error");
      setResultAndSummary("autosave", {
        error: err.message
      });
    }
  }

  function triggerAutosave() {
    setAutosave("pending...");
    if (autosaveTimer) clearTimeout(autosaveTimer);
    autosaveTimer = setTimeout(saveDraftAuto, 3000);
  }

  async function loadFlow() {
    try {
      const flowRes = await window.API.get(`/flows/${flowId}`);
      const draftRes = await window.API.get(`/flows/${flowId}/drafts`);

      const flow = flowRes?.data;
      const draft = draftRes?.data;

      builderMeta.textContent = `Flow #${flow.id} • ${flow.name}`;

      let definition = presets.blank;

      if (draft?.draft_json) {
        definition = JSON.parse(draft.draft_json);
        setLastSaved(draft.created_at || null);
      } else if (flow?.definition_json) {
        definition = JSON.parse(flow.definition_json);
      }

      setJsonToEditor(definition);
      setAutosave("idle");

      setResultAndSummary("load", {
        loaded: true,
        current_user: me,
        flow,
        latest_draft: draft
      });

      renderHistory();
    } catch (err) {
      setResultAndSummary("load", {
        error: err.message
      });
    }
  }

  function insertNode(type) {
    const parsed = safeParse();
    if (!parsed.ok) {
      setResultAndSummary("insert_node", { error: parsed.error });
      return;
    }

    const definition = parsed.data;
    if (!Array.isArray(definition.nodes)) definition.nodes = [];
    if (!Array.isArray(definition.edges)) definition.edges = [];

    const nextId = `${type}_${Date.now()}`;

    let node = { id: nextId, type };

    if (type === "transform") {
      node = { id: nextId, type, data: { text: "New transform" } };
    }

    if (type === "if") {
      node = { id: nextId, type, data: { test: true } };
    }

    definition.nodes.push(node);
    setJsonToEditor(definition);
    triggerAutosave();

    setResultAndSummary("insert_node", {
      inserted: node,
      definition
    });
  }

  logoutBtn.addEventListener("click", () => {
    window.Auth.logoutAndRedirect();
  });

  definitionInput.addEventListener("input", triggerAutosave);

  presetBlankBtn.addEventListener("click", () => {
    setJsonToEditor(presets.blank);
    triggerAutosave();
  });

  presetHelloBtn.addEventListener("click", () => {
    setJsonToEditor(presets.hello);
    triggerAutosave();
  });

  presetIfBtn.addEventListener("click", () => {
    setJsonToEditor(presets.ifflow);
    triggerAutosave();
  });

  formatJsonBtn.addEventListener("click", () => {
    const parsed = safeParse();
    if (!parsed.ok) {
      return setResultAndSummary("format_json", { error: parsed.error });
    }
    setJsonToEditor(parsed.data);
    setResultAndSummary("format_json", { ok: true });
  });

  document.querySelectorAll(".palette-item").forEach((button) => {
    button.addEventListener("click", () => {
      const type = button.dataset.nodeType;
      if (type) insertNode(type);
    });
  });

  saveBuilderBtn.addEventListener("click", async () => {
    const parsed = safeParse();
    if (!parsed.ok) {
      return setResultAndSummary("save_flow", { error: parsed.error });
    }

    try {
      const res = await window.API.put(`/builder/flows/${flowId}`, {
        definition_json: parsed.data
      });

      setResultAndSummary("save_flow", {
        result: res
      });
    } catch (err) {
      setResultAndSummary("save_flow", {
        error: err.message
      });
    }
  });

  saveDraftBtn.addEventListener("click", async () => {
    const parsed = safeParse();
    if (!parsed.ok) {
      return setResultAndSummary("save_draft", { error: parsed.error });
    }

    try {
      const res = await window.API.post(`/flows/${flowId}/drafts`, {
        draft_json: parsed.data
      });

      const ts = Date.now();
      setLastSaved(ts);

      setResultAndSummary("save_draft", {
        saved_at: ts,
        result: res
      });
    } catch (err) {
      setResultAndSummary("save_draft", {
        error: err.message
      });
    }
  });

  validateBtn.addEventListener("click", async () => {
    const parsed = safeParse();
    if (!parsed.ok) {
      return setResultAndSummary("validate", { error: parsed.error });
    }

    try {
      const res = await window.API.post(`/builder/flows/${flowId}/validate`, {
        definition_json: parsed.data
      });

      setResultAndSummary("validate", {
        result: res
      });
    } catch (err) {
      setResultAndSummary("validate", {
        error: err.message
      });
    }
  });

  previewBtn.addEventListener("click", async () => {
    const parsed = safeParse();
    if (!parsed.ok) {
      return setResultAndSummary("preview", { error: parsed.error });
    }

    try {
      const res = await window.API.post(`/builder/flows/${flowId}/preview`, {
        definition_json: parsed.data
      });

      setResultAndSummary("preview", {
        result: res
      });
    } catch (err) {
      setResultAndSummary("preview", {
        error: err.message
      });
    }
  });

  runBtn.addEventListener("click", async () => {
    try {
      const run = await window.API.post(`/flows/${flowId}/run`, {});
      const id = run?.data?.execution_id;

      let execution = null;
      if (id) {
        execution = await window.API.get(`/executions/${id}`);
        if (execution?.data) {
          executionHistory.push(execution.data);
          renderHistory();
        }
      }

      setResultAndSummary("run", {
        run,
        execution
      });
    } catch (err) {
      setResultAndSummary("run", {
        error: err.message
      });
    }
  });

  reloadHistoryBtn.addEventListener("click", () => {
    renderHistory();
    setResultAndSummary("history_reload", {
      history_count: executionHistory.length
    });
  });

  loadFlow();
})();
