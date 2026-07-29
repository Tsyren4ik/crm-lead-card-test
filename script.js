const STORAGE_KEY = "crm_leads";

const STAGES = [
  "Новый лид",
  "Квалифицирован",
  "Назначена консультация",
  "Отказ",
];

const leadForm = document.querySelector("#leadForm");
const clientNameInput = document.querySelector("#clientName");
const clientPhoneInput = document.querySelector("#clientPhone");
const leadSourceSelect = document.querySelector("#leadSource");
const responsibleSelect = document.querySelector("#responsible");
const dealStageSelect = document.querySelector("#dealStage");
const specificationCheckbox = document.querySelector("#specificationRequested");
const formMessage = document.querySelector("#formMessage");
const leadsList = document.querySelector("#leadsList");
const emptyState = document.querySelector("#emptyState");
const leadsCount = document.querySelector("#leadsCount");

let leads = loadLeads();
let messageTimer;

// Загружаем сохранённые данные и не даём повреждённому JSON сломать приложение.
function loadLeads() {
  try {
    const savedData = localStorage.getItem(STORAGE_KEY);

    if (!savedData) {
      return [];
    }

    const parsedData = JSON.parse(savedData);
    return Array.isArray(parsedData) ? parsedData : [];
  } catch (error) {
    console.warn("Сохранённые лиды не удалось прочитать.", error);
    return [];
  }
}

// Сохраняем весь актуальный массив лидов под отдельным ключом.
function saveLeads() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(leads));
    return true;
  } catch (error) {
    console.warn("Лиды не удалось сохранить.", error);
    showMessage("Не удалось сохранить данные в браузере.", "error");
    return false;
  }
}

function getFormValues() {
  return {
    name: clientNameInput.value.trim(),
    phone: clientPhoneInput.value.trim(),
    source: leadSourceSelect.value,
    responsible: responsibleSelect.value,
    stage: dealStageSelect.value,
    specificationRequested: specificationCheckbox.checked,
  };
}

// Проверяем обязательные поля и показываем ошибку рядом с каждым из них.
function validateForm(values) {
  clearFieldError(clientNameInput, "clientNameError");
  clearFieldError(clientPhoneInput, "clientPhoneError");

  let isValid = true;

  if (!values.name) {
    setFieldError(clientNameInput, "clientNameError", "Введите имя клиента.");
    isValid = false;
  }

  if (!values.phone) {
    setFieldError(clientPhoneInput, "clientPhoneError", "Введите номер телефона.");
    isValid = false;
  }

  if (!isValid) {
    showMessage("Заполните обязательные поля.", "error");
    const firstInvalidField = leadForm.querySelector('[aria-invalid="true"]');
    firstInvalidField.focus();
  }

  return isValid;
}

function setFieldError(input, errorId, message) {
  input.classList.add("field-input--error");
  input.setAttribute("aria-invalid", "true");
  document.querySelector(`#${errorId}`).textContent = message;
}

function clearFieldError(input, errorId) {
  input.classList.remove("field-input--error");
  input.removeAttribute("aria-invalid");
  document.querySelector(`#${errorId}`).textContent = "";
}

function createLead(values) {
  return {
    id: createUniqueId(),
    name: values.name,
    phone: values.phone,
    source: values.source,
    responsible: values.responsible,
    stage: values.stage,
    specificationRequested: values.specificationRequested,
    createdAt: new Date().toISOString(),
  };
}

function createUniqueId() {
  if (window.crypto && typeof window.crypto.randomUUID === "function") {
    return window.crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

// Создаём карточки через DOM API, а пользовательские данные выводим через textContent.
function renderLeads() {
  leadsList.replaceChildren();
  emptyState.hidden = leads.length > 0;
  leadsCount.textContent = getLeadsCountText(leads.length);

  leads.forEach((lead) => {
    const card = document.createElement("article");
    card.className = "lead-card";

    const header = document.createElement("div");
    header.className = "lead-card__header";

    const identity = document.createElement("div");
    const name = document.createElement("h3");
    name.className = "lead-card__name";
    name.textContent = lead.name;

    const phone = document.createElement("p");
    phone.className = "lead-card__phone";
    phone.textContent = lead.phone;

    const badge = document.createElement("span");
    badge.className = "lead-card__badge";
    badge.textContent = lead.stage;

    identity.append(name, phone);
    header.append(identity, badge);

    const details = document.createElement("dl");
    details.className = "lead-details";
    details.append(
      createDetail("Источник", lead.source),
      createDetail("Ответственный", lead.responsible),
      createDetail("Запрошено ТЗ", lead.specificationRequested ? "Да" : "Нет"),
      createDetail("Создан", formatDate(lead.createdAt)),
    );

    const stageField = document.createElement("div");
    stageField.className = "stage-field";

    const stageLabel = document.createElement("label");
    const stageSelect = document.createElement("select");
    const stageSelectId = `stage-${lead.id}`;

    stageLabel.setAttribute("for", stageSelectId);
    stageLabel.textContent = "Изменить этап сделки";

    stageSelect.id = stageSelectId;
    stageSelect.className = "stage-select";
    stageSelect.dataset.leadId = lead.id;

    STAGES.forEach((stage) => {
      const option = document.createElement("option");
      option.value = stage;
      option.textContent = stage;
      option.selected = stage === lead.stage;
      stageSelect.append(option);
    });

    stageSelect.addEventListener("change", (event) => {
      updateLeadStage(lead.id, event.target.value);
    });

    stageField.append(stageLabel, stageSelect);
    card.append(header, details, stageField);
    leadsList.append(card);
  });
}

function createDetail(label, value) {
  const detail = document.createElement("div");
  detail.className = "lead-detail";

  const term = document.createElement("dt");
  term.textContent = label;

  const description = document.createElement("dd");
  description.textContent = value;

  detail.append(term, description);
  return detail;
}

// Находим лид по id, меняем этап и сразу сохраняем обновлённый массив.
function updateLeadStage(leadId, newStage) {
  const lead = leads.find((item) => item.id === leadId);

  if (!lead || !STAGES.includes(newStage)) {
    return;
  }

  const previousStage = lead.stage;
  lead.stage = newStage;

  if (!saveLeads()) {
    lead.stage = previousStage;
    renderLeads();
    return;
  }

  renderLeads();
  showMessage("Этап сделки обновлён.", "success");
}

function resetForm() {
  leadForm.reset();
  clearFieldError(clientNameInput, "clientNameError");
  clearFieldError(clientPhoneInput, "clientPhoneError");
  clientNameInput.focus();
}

function formatDate(dateString) {
  const date = new Date(dateString);

  if (Number.isNaN(date.getTime())) {
    return "Дата не указана";
  }

  return new Intl.DateTimeFormat("ru-RU", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function getLeadsCountText(count) {
  const lastTwoDigits = count % 100;
  const lastDigit = count % 10;

  if (lastTwoDigits >= 11 && lastTwoDigits <= 14) {
    return `${count} лидов`;
  }

  if (lastDigit === 1) {
    return `${count} лид`;
  }

  if (lastDigit >= 2 && lastDigit <= 4) {
    return `${count} лида`;
  }

  return `${count} лидов`;
}

function showMessage(text, type) {
  clearTimeout(messageTimer);
  formMessage.textContent = text;
  formMessage.className = `form-message form-message--visible form-message--${type}`;

  if (type === "success") {
    messageTimer = setTimeout(clearMessage, 3500);
  }
}

function clearMessage() {
  clearTimeout(messageTimer);
  formMessage.textContent = "";
  formMessage.className = "form-message";
}

leadForm.addEventListener("submit", (event) => {
  event.preventDefault();

  const values = getFormValues();

  if (!validateForm(values)) {
    return;
  }

  const newLead = createLead(values);
  leads.unshift(newLead);

  if (!saveLeads()) {
    leads.shift();
    return;
  }

  renderLeads();
  resetForm();
  showMessage("Лид успешно сохранён.", "success");
});

[clientNameInput, clientPhoneInput].forEach((input) => {
  input.addEventListener("input", () => {
    if (input.value.trim()) {
      clearFieldError(input, `${input.id}Error`);
    }

    if (clientNameInput.value.trim() && clientPhoneInput.value.trim()) {
      clearMessage();
    }
  });
});

renderLeads();
