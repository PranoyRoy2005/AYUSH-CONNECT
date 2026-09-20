/**
 * AYUSH CONNECT — Assessment Module
 * SIH 2026: Adaptive Skill Assessment Engine
 */

import { getCurrentUser, showToast } from './auth.js';
import { fetchAssessmentQuestions, saveAssessmentSubmission } from './supabase.js';

export const ASSESSMENT_DATA = {
  meta: {
    title: 'AYUSH Interdisciplinary Skill & Clinical Informatics Assessment',
    totalQuestions: 20,
    estimatedMinutes: 25,
    difficulty: 'Intermediate — Advanced',
    skillsTested: ['Herbal Pharmacopoeia (QC)', 'Clinical Data & Python', 'Biostatistics & SQL', 'Regulatory Pharmacovigilance', 'Clinical Problem Solving']
  },
  questions: [
    {
      id: 1,
      skill: 'Herbal Pharmacopoeia (QC)',
      text: 'In Ayurvedic drug standardization, which chromatography technique is primary for creating fingerprint profiles of polyherbal formulations according to API standards?',
      options: [
        'High-Performance Thin-Layer Chromatography (HPTLC)',
        'Gas Chromatography with Flame Ionization only',
        'Gel Permeation Chromatography',
        'Paper Partition Chromatography'
      ],
      correct: 0,
      explanation: 'HPTLC provides multi-wavelength fingerprinting suitable for complex botanical matrices mandated by the Ayurvedic Pharmacopoeia of India (API).'
    },
    {
      id: 2,
      skill: 'Biostatistics & SQL',
      text: 'You have a clinical trial table `patient_vitals` with columns `(patient_id, dosha_prakriti, bp_systolic)`. Which SQL query computes the average systolic blood pressure grouped by Prakriti?',
      options: [
        'SELECT dosha_prakriti, AVG(bp_systolic) FROM patient_vitals GROUP BY dosha_prakriti;',
        'SELECT AVG(bp_systolic) FROM patient_vitals ORDER BY dosha_prakriti;',
        'SELECT dosha_prakriti, SUM(bp_systolic)/COUNT(*) FROM patient_vitals;',
        'GROUP BY dosha_prakriti SELECT bp_systolic FROM patient_vitals;'
      ],
      correct: 0,
      explanation: 'Standard SQL aggregate function AVG() with GROUP BY accurately aggregates metrics per dosha category.'
    },
    {
      id: 3,
      skill: 'Clinical Data & Python',
      text: 'Which Python library ecosystem is standard for managing tabular electronic health records, handling missing clinical values, and performing cohort filtering?',
      options: [
        'Pandas and NumPy',
        'Pygame and Turtle',
        'Flask and Jinja',
        'Socket and Asyncio'
      ],
      correct: 0,
      explanation: 'Pandas DataFrames and NumPy arrays form the foundational stack for biomedical and epidemiological data manipulation.'
    },
    {
      id: 4,
      skill: 'Regulatory Pharmacovigilance',
      text: 'Under the National Pharmacovigilance Programme for ASU&H drugs in India, what constitutes a "Serious Adverse Drug Reaction"?',
      options: [
        'Any reaction that causes patient annoyance',
        'Reaction resulting in death, inpatient hospitalization, persistent disability, or congenital anomaly',
        'A reaction with mild transient headache only',
        'Any unexpected taste alteration during herbal tea ingestion'
      ],
      correct: 1,
      explanation: 'WHO-UMC and Ministry of AYUSH regulatory frameworks define Serious ADRs by criteria of mortality, hospitalization, or permanent incapacity.'
    },
    {
      id: 5,
      skill: 'Clinical Problem Solving',
      text: 'When conducting an observational trial on Ashwagandha (Withania somnifera) for stress resilience, which validated psychometric scale is globally accepted as a primary clinical endpoint?',
      options: [
        'Perceived Stress Scale (PSS-10) and Serum Cortisol biomarkers',
        'Richter Magnitude Scale',
        'Mohs Hardness Scale',
        'Body Mass Index alone'
      ],
      correct: 0,
      explanation: 'The PSS-10 scale combined with objective morning serum cortisol levels provides dual psychological and biochemical validation.'
    },
    {
      id: 6,
      skill: 'Biostatistics & SQL',
      text: 'Which statistical hypothesis test is most appropriate to compare mean blood glucose reduction between an Ayurvedic herb group and a placebo control group?',
      options: [
        'Independent Two-Sample Student t-test',
        'Simple Chi-Square test of independence only',
        'Linear Regression with R-squared = 0',
        'Cronbach Alpha coefficient'
      ],
      correct: 0,
      explanation: 'The independent two-sample t-test compares the continuous outcome means between two parallel treatment arms.'
    },
    {
      id: 7,
      skill: 'Clinical Data & Python',
      text: 'What is the primary role of Natural Language Processing (NLP) when parsing classical Sanskrit Ayurvedic treatises (e.g., Charaka Samhita) into digital clinical ontologies?',
      options: [
        'Named Entity Recognition (NER) to extract medicinal plants, disease terms, and formulation recipes',
        'Rendering 3D video game animations',
        'Compressing audio files into MP3 format',
        'Generating random password strings'
      ],
      correct: 0,
      explanation: 'Biomedical NLP utilizes specialized NER to structure botanical and therapeutic entities for the AYUSH National Morbidity Codes.'
    },
    {
      id: 8,
      skill: 'Herbal Pharmacopoeia (QC)',
      text: 'Heavy metal toxicity testing in Ayurvedic preparations is strictly enforced. Which instrument delivers the lowest detection limits for Lead (Pb), Arsenic (As), and Mercury (Hg)?',
      options: [
        'Inductively Coupled Plasma Mass Spectrometry (ICP-MS)',
        'Standard UV-Visible Spectrophotometer',
        'Simple Glass Hydrometer',
        'Compound Optical Microscope'
      ],
      correct: 0,
      explanation: 'ICP-MS can detect trace elemental contaminants at parts-per-billion (ppb) levels, meeting international pharmacopoeial safety norms.'
    },
    {
      id: 9,
      skill: 'Regulatory Pharmacovigilance',
      text: 'Where should a registered AYUSH practitioner in India submit suspected adverse drug reaction reporting forms?',
      options: [
        'To designated Intermediary / Peripheral Pharmacovigilance Centres (PPvC/IPvC) under AllA / NPvCC',
        'To local municipality sanitation offices',
        'To the local post office only',
        'Directly to social media platforms'
      ],
      correct: 0,
      explanation: 'Reporting flows from peripheral centres to national coordination centers like AllA New Delhi for causality assessment.'
    },
    {
      id: 10,
      skill: 'Clinical Problem Solving',
      text: 'During batch stability testing, a liquid herbal Arishta formulation exhibits increased microbial colony counts after 30 days. What is the immediate correct regulatory step?',
      options: [
        'Quarantine the batch, initiate Out-of-Specification (OOS) investigation, and review aseptic fermentation parameters',
        'Add artificial sugar and immediately bottle for market distribution',
        'Ignore test since natural products inherently have high microbial loads',
        'Sell the product at a 50% discount'
      ],
      correct: 0,
      explanation: 'Good Manufacturing Practices (Schedule T) require systematic OOS protocols and quarantine upon microbiological failure.'
    },
    {
      id: 11,
      skill: 'Biostatistics & SQL',
      text: 'In SQL, which clause is used to filter aggregated group results (for instance, showing only clinics with count of enrolled patients > 50)?',
      options: ['HAVING', 'WHERE', 'ORDER BY', 'LIMIT'],
      correct: 0,
      explanation: 'HAVING filters results after aggregation, while WHERE filters row-level records before grouping.'
    },
    {
      id: 12,
      skill: 'Clinical Data & Python',
      text: 'Which metric is best suited to evaluate an AI model predicting whether a patient belongs to Vata, Pitta, or Kapha dominant Prakriti with imbalanced class distribution?',
      options: [
        'Macro-averaged F1-Score and Confusion Matrix',
        'Raw Accuracy score alone',
        'Mean Squared Error (MSE)',
        'Total line count in source code'
      ],
      correct: 0,
      explanation: 'Macro F1-score balances precision and recall equally across multi-class distributions regardless of class imbalances.'
    },
    {
      id: 13,
      skill: 'Herbal Pharmacopoeia (QC)',
      text: 'What does "Total Ash Value" indicate when analyzing raw Ayurvedic crude herbs?',
      options: [
        'Total amount of inorganic material and earthy adulterants remaining after complete incineration',
        'The moisture content percentage of the leaf',
        'The water-soluble extractive percentage',
        'The pesticide residue level'
      ],
      correct: 0,
      explanation: 'Ash value determination measures non-volatile inorganic salts and silica residues.'
    },
    {
      id: 14,
      skill: 'Clinical Problem Solving',
      text: 'What is the primary requirement for conducting human clinical trials of proprietary AYUSH drugs under Indian GCP guidelines?',
      options: [
        'Institutional Ethics Committee (IEC) approval and prospective CTRI registration',
        'A verbal consent from the investigator only',
        'Publishing the trial results before starting',
        'A patent filing receipt only'
      ],
      correct: 0,
      explanation: 'Prospective registration with the Clinical Trials Registry - India (CTRI) and ethical clearance are statutory requirements.'
    },
    {
      id: 15,
      skill: 'Regulatory Pharmacovigilance',
      text: 'Which Schedule of the Drugs and Cosmetics Act governs the Good Manufacturing Practices (GMP) for Ayurvedic, Siddha, and Unani medicines in India?',
      options: ['Schedule T', 'Schedule M', 'Schedule H', 'Schedule X'],
      correct: 0,
      explanation: 'Schedule T specifies factory premises, hygiene, machinery, and quality control requirements for ASU drugs.'
    },
    {
      id: 16,
      skill: 'Biostatistics & SQL',
      text: 'What does a p-value < 0.05 signify in an AYUSH randomized controlled clinical trial comparing an herbal formulation with baseline?',
      options: [
        'Statistically significant difference; probability of observing results by random chance is less than 5%',
        'The drug is 95% ineffective',
        'The sample size was too small to calculate anything',
        'The trial must be cancelled immediately'
      ],
      correct: 0,
      explanation: 'A p-value under 0.05 denotes standard rejection of the null hypothesis.'
    },
    {
      id: 17,
      skill: 'Clinical Data & Python',
      text: 'When preparing electronic health record data for machine learning, which technique handles categorical data like Prakriti = {Vata, Pitta, Kapha} without imposing artificial ordinal ranks?',
      options: [
        'One-Hot Encoding (pd.get_dummies)',
        'Arbitrary random integer assignment',
        'Deleting the column completely',
        'Linear interpolation'
      ],
      correct: 0,
      explanation: 'One-hot encoding creates binary orthogonal vectors representing nominal categorical variables.'
    },
    {
      id: 18,
      skill: 'Herbal Pharmacopoeia (QC)',
      text: 'What is the objective of "Aflatoxin testing" in medicinal plant raw materials stored in humid warehouse conditions?',
      options: [
        'Detecting carcinogenic mycotoxins produced by Aspergillus fungi',
        'Measuring total chlorophyll concentration',
        'Calculating essential oil yield',
        'Assessing leaf thickness'
      ],
      correct: 0,
      explanation: 'Aflatoxins B1, B2, G1, and G2 are dangerous fungal metabolites regulated strictly for human consumption.'
    },
    {
      id: 19,
      skill: 'Clinical Problem Solving',
      text: 'An industry sponsor wants to develop a standardized herbal extract for cognitive enhancement. Which critical phase must precede phase I human trials?',
      options: [
        'In-vitro biological screening and preclinical acute/sub-acute animal toxicity profiling',
        'Television commercial advertising campaign',
        'Commercial mass packaging and export shipping',
        'Direct retail sales to consumers'
      ],
      correct: 0,
      explanation: 'Preclinical safety, LD50 toxicity testing, and active phytochemical characterization are mandatory safety milestones.'
    },
    {
      id: 20,
      skill: 'Regulatory Pharmacovigilance',
      text: 'Under the AYUSH National Morbidity Codes (NAMASTE portal), how are traditional diagnoses systematically mapped for global statistical reporting?',
      options: [
        'Bridged with WHO International Classification of Diseases (ICD-11 Traditional Medicine Chapter 2)',
        'Stored as unstructured handwritten paper records only',
        'Translated into Greek mythology characters',
        'No standardized mapping exists'
      ],
      correct: 0,
      explanation: 'NAMASTE codes are harmonized with WHO ICD-11 Chapter 2 for traditional medicine integration.'
    }
  ]
};

export class AssessmentEngine {
  constructor() {
    this.currentIndex = 0;
    this.answers = {};
    this.timeRemainingSeconds = 25 * 60;
    this.timerInterval = null;
    this.isSubmitted = false;
    this.questions = [];
  }

  async loadQuestions() {
    try {
      const qList = await fetchAssessmentQuestions();
      if (Array.isArray(qList) && qList.length > 0) {
        this.questions = qList;
      } else {
        this.questions = ASSESSMENT_DATA.questions;
      }
    } catch (e) {
      console.warn('Error loading questions:', e);
      this.questions = ASSESSMENT_DATA.questions;
    }
  }

  async init() {
    await this.loadQuestions();

    const readyScreen = document.getElementById('exam-ready-screen');
    const inProgressContainer = document.getElementById('exam-in-progress-container');
    const startBtn = document.getElementById('btn-start-exam-now');

    if (startBtn && readyScreen && inProgressContainer) {
      startBtn.addEventListener('click', async () => {
        const envCheck = document.getElementById('check-ready-environment');
        const rulesCheck = document.getElementById('check-ready-rules');
        if ((envCheck && !envCheck.checked) || (rulesCheck && !rulesCheck.checked)) {
          showToast('Please confirm all candidate readiness checkboxes before proceeding.', 'error');
          return;
        }

        if (this.questions.length === 0) {
          await this.loadQuestions();
        }

        readyScreen.style.display = 'none';
        inProgressContainer.style.display = 'block';
        this.renderQuestion();
        this.startTimer();
        this.bindEvents();
        showToast('Exam started. 25:00 countdown is now active. Good luck!', 'success');
      });
      this.bindEvents();
    } else {
      // Fallback if ready screen isn't present
      this.renderQuestion();
      this.startTimer();
      this.bindEvents();
    }
  }

  startTimer() {
    const timerEl = document.getElementById('assessment-timer');
    if (!timerEl) return;

    this.timerInterval = setInterval(() => {
      if (this.timeRemainingSeconds <= 0) {
        clearInterval(this.timerInterval);
        this.submitAssessment();
        return;
      }
      this.timeRemainingSeconds--;
      const mins = Math.floor(this.timeRemainingSeconds / 60);
      const secs = this.timeRemainingSeconds % 60;
      timerEl.textContent = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }, 1000);
  }

  renderQuestion() {
    const list = this.questions && this.questions.length > 0 ? this.questions : ASSESSMENT_DATA.questions;
    const q = list[this.currentIndex];
    if (!q) return;

    const qNumEl = document.getElementById('q-counter');
    const qTextEl = document.getElementById('q-text');
    const qSkillEl = document.getElementById('q-skill-badge');
    const optionsContainer = document.getElementById('options-container');
    const progressEl = document.getElementById('assessment-progress-fill');

    if (qNumEl) qNumEl.textContent = `Question ${this.currentIndex + 1} of ${list.length}`;
    if (qTextEl) qTextEl.textContent = q.text;
    if (qSkillEl) qSkillEl.textContent = q.skill || 'AYUSH Skill';

    if (progressEl) {
      const pct = Math.round(((this.currentIndex + 1) / list.length) * 100);
      progressEl.style.width = `${pct}%`;
    }

    if (optionsContainer) {
      const letters = ['A', 'B', 'C', 'D'];
      optionsContainer.innerHTML = q.options.map((opt, idx) => {
        const isSelected = this.answers[q.id] === idx;
        return `
          <div class="option-item ${isSelected ? 'selected' : ''}" onclick="window.assessmentEngine.selectOption(${idx})">
            <div class="option-letter">${letters[idx]}</div>
            <div style="font-size: 0.95rem; color: var(--text-primary); font-weight: 500;">${opt}</div>
          </div>
        `;
      }).join('');
    }

    // Toggle button visibility
    const prevBtn = document.getElementById('btn-prev-q');
    const nextBtn = document.getElementById('btn-next-q');
    const submitBtn = document.getElementById('btn-submit-q');

    if (prevBtn) prevBtn.style.visibility = this.currentIndex === 0 ? 'hidden' : 'visible';
    if (nextBtn) nextBtn.style.display = this.currentIndex === list.length - 1 ? 'none' : 'inline-flex';
    if (submitBtn) submitBtn.style.display = this.currentIndex === list.length - 1 ? 'inline-flex' : 'none';
  }

  selectOption(optIndex) {
    const list = this.questions && this.questions.length > 0 ? this.questions : ASSESSMENT_DATA.questions;
    const q = list[this.currentIndex];
    if (!q) return;
    this.answers[q.id] = optIndex;
    this.renderQuestion();
  }

  nextQuestion() {
    const list = this.questions && this.questions.length > 0 ? this.questions : ASSESSMENT_DATA.questions;
    if (this.currentIndex < list.length - 1) {
      this.currentIndex++;
      this.renderQuestion();
    }
  }

  prevQuestion() {
    if (this.currentIndex > 0) {
      this.currentIndex--;
      this.renderQuestion();
    }
  }

  async submitAssessment() {
    if (this.timerInterval) clearInterval(this.timerInterval);
    this.isSubmitted = true;

    const list = this.questions && this.questions.length > 0 ? this.questions : ASSESSMENT_DATA.questions;

    // Calculate score
    let correctCount = 0;
    const skillBreakdown = {};

    list.forEach(q => {
      const skillName = q.skill || 'AYUSH Competency';
      if (!skillBreakdown[skillName]) {
        skillBreakdown[skillName] = { total: 0, correct: 0 };
      }
      skillBreakdown[skillName].total++;

      if (this.answers[q.id] === q.correct) {
        correctCount++;
        skillBreakdown[skillName].correct++;
      }
    });

    const scorePct = Math.round((correctCount / list.length) * 100);

    // Prepare per-skill proficiency scores
    const skillScores = {};
    for (const [skillName, data] of Object.entries(skillBreakdown)) {
      skillScores[skillName] = Math.round((data.correct / (data.total || 1)) * 100);
    }

    // Save to real database table student_skills & recalculate matches
    const user = getCurrentUser();
    await saveAssessmentSubmission(user?.id, skillScores, scorePct);

    // Hide Question UI and render Result Panel
    const questionCard = document.getElementById('question-ui-card');
    const resultCard = document.getElementById('result-ui-card');
    if (questionCard) questionCard.style.display = 'none';
    if (resultCard) {
      resultCard.style.display = 'block';
      this.renderResults(scorePct, correctCount, skillBreakdown, list.length);
    }

    showToast(`Assessment submitted! Score: ${scorePct}% saved to your verified profile.`, 'success');
  }

  renderResults(scorePct, correctCount, breakdown, totalQCount = 20) {
    const scoreValEl = document.getElementById('res-score-val');
    const scoreDescEl = document.getElementById('res-score-desc');
    const breakdownListEl = document.getElementById('res-breakdown-list');

    if (scoreValEl) scoreValEl.textContent = `${scorePct}%`;
    if (scoreDescEl) {
      scoreDescEl.textContent = `You correctly answered ${correctCount} out of ${totalQCount} questions. Your competency ratings have been saved to your student profile.`;
    }

    if (breakdownListEl) {
      breakdownListEl.innerHTML = Object.entries(breakdown).map(([skill, data]) => {
        const pct = Math.round((data.correct / (data.total || 1)) * 100);
        const isStrong = pct >= 75;
        return `
          <div style="margin-bottom: 1rem;">
            <div style="display: flex; justify-content: space-between; font-size: 0.88rem; font-weight: 600; margin-bottom: 0.35rem;">
              <span style="color: var(--primary-deep);">${skill}</span>
              <span style="color: ${isStrong ? '#10b981' : 'var(--accent-saffron)'}; font-weight: 700;">${pct}% (${data.correct}/${data.total})</span>
            </div>
            <div class="progress-track">
              <div class="progress-fill ${isStrong ? '' : 'saffron'}" style="width: ${pct}%;"></div>
            </div>
          </div>
        `;
      }).join('');
    }
  }

  bindEvents() {
    window.assessmentEngine = this;
  }
}

export default {
  ASSESSMENT_DATA,
  AssessmentEngine
};
