export interface MedicalCondition {
  readonly id: string
  readonly label: string
  readonly category: string
}

export const MEDICAL_CONDITIONS: readonly MedicalCondition[] = [
  // ── Cardiovascular ──────────────────────────────────────────────────
  { id: "highBloodPressure", label: "High Blood Pressure", category: "Cardiovascular" },
  { id: "cardiac", label: "Heart Disease / Cardiac", category: "Cardiovascular" },
  { id: "afib", label: "Atrial Fibrillation (A-Fib)", category: "Cardiovascular" },
  { id: "stroke", label: "Stroke / CVA", category: "Cardiovascular" },
  { id: "tia", label: "TIA (Transient Ischemic Attack)", category: "Cardiovascular" },
  { id: "heartAttack", label: "Heart Attack (Myocardial Infarction)", category: "Cardiovascular" },
  { id: "coronaryArteryDisease", label: "Coronary Artery Disease", category: "Cardiovascular" },
  { id: "angina", label: "Angina", category: "Cardiovascular" },
  { id: "congestiveHeartFailure", label: "Congestive Heart Failure", category: "Cardiovascular" },
  { id: "cardiomyopathy", label: "Cardiomyopathy", category: "Cardiovascular" },
  { id: "heartMurmur", label: "Heart Murmur", category: "Cardiovascular" },
  { id: "heartValveDisease", label: "Heart Valve Disease", category: "Cardiovascular" },
  { id: "peripheralVascularDisease", label: "Peripheral Vascular Disease", category: "Cardiovascular" },
  { id: "aorticAneurysm", label: "Aortic Aneurysm", category: "Cardiovascular" },
  { id: "pacemakerDefibrillator", label: "Pacemaker / Defibrillator", category: "Cardiovascular" },
  { id: "deepVeinThrombosis", label: "Deep Vein Thrombosis (DVT)", category: "Cardiovascular" },
  { id: "carotidArteryDisease", label: "Carotid Artery Disease", category: "Cardiovascular" },
  { id: "angioplastyStent", label: "Angioplasty / Stent", category: "Cardiovascular" },
  { id: "bypassSurgery", label: "Bypass Surgery (CABG)", category: "Cardiovascular" },

  // ── Respiratory ─────────────────────────────────────────────────────
  { id: "copd", label: "COPD", category: "Respiratory" },
  { id: "asthma", label: "Asthma", category: "Respiratory" },
  { id: "sleepApnea", label: "Sleep Apnea", category: "Respiratory" },
  { id: "emphysema", label: "Emphysema", category: "Respiratory" },
  { id: "chronicBronchitis", label: "Chronic Bronchitis", category: "Respiratory" },
  { id: "pulmonaryEmbolism", label: "Pulmonary Embolism", category: "Respiratory" },
  { id: "pulmonaryFibrosis", label: "Pulmonary Fibrosis", category: "Respiratory" },
  { id: "cysticFibrosis", label: "Cystic Fibrosis", category: "Respiratory" },
  { id: "sarcoidosis", label: "Sarcoidosis", category: "Respiratory" },
  { id: "tuberculosis", label: "Tuberculosis", category: "Respiratory" },

  // ── Metabolic / Endocrine ───────────────────────────────────────────
  { id: "diabetesType1", label: "Diabetes Type 1", category: "Metabolic" },
  { id: "diabetesType2", label: "Diabetes Type 2", category: "Metabolic" },
  { id: "thyroidDisorder", label: "Thyroid Disorder", category: "Metabolic" },
  { id: "gout", label: "Gout", category: "Metabolic" },
  { id: "elevatedCholesterol", label: "Elevated Cholesterol", category: "Metabolic" },
  { id: "cushings", label: "Cushing's Syndrome", category: "Metabolic" },
  { id: "addisons", label: "Addison's Disease", category: "Metabolic" },

  // ── Neurological ────────────────────────────────────────────────────
  { id: "epilepsy", label: "Epilepsy", category: "Neurological" },
  { id: "seizures", label: "Seizures", category: "Neurological" },
  { id: "parkinsons", label: "Parkinson's Disease", category: "Neurological" },
  { id: "alzheimers", label: "Alzheimer's / Dementia", category: "Neurological" },
  { id: "multipleSclerosis", label: "Multiple Sclerosis", category: "Neurological" },
  { id: "als", label: "ALS (Lou Gehrig's Disease)", category: "Neurological" },
  { id: "muscularDystrophy", label: "Muscular Dystrophy", category: "Neurological" },
  { id: "cerebralPalsy", label: "Cerebral Palsy", category: "Neurological" },
  { id: "huntingtons", label: "Huntington's Disease", category: "Neurological" },
  { id: "narcolepsy", label: "Narcolepsy", category: "Neurological" },
  { id: "neuropathy", label: "Neuropathy", category: "Neurological" },

  // ── Mental Health ───────────────────────────────────────────────────
  { id: "anxiety", label: "Anxiety", category: "Mental Health" },
  { id: "depression", label: "Depression", category: "Mental Health" },
  { id: "bipolar", label: "Bipolar Disorder", category: "Mental Health" },
  { id: "schizophrenia", label: "Schizophrenia", category: "Mental Health" },
  { id: "ptsd", label: "PTSD", category: "Mental Health" },
  { id: "adhd", label: "ADHD / ADD", category: "Mental Health" },
  { id: "eatingDisorder", label: "Eating Disorder (Anorexia / Bulimia)", category: "Mental Health" },
  { id: "suicideAttempt", label: "Suicide Attempt (history)", category: "Mental Health" },

  // ── Oncology ────────────────────────────────────────────────────────
  { id: "cancer", label: "Cancer (history)", category: "Oncology" },
  { id: "melanoma", label: "Melanoma", category: "Oncology" },
  { id: "basalCellCarcinoma", label: "Basal Cell Carcinoma", category: "Oncology" },
  { id: "leukemia", label: "Leukemia", category: "Oncology" },
  { id: "lymphoma", label: "Lymphoma (Hodgkin's / Non-Hodgkin's)", category: "Oncology" },

  // ── Gastrointestinal ────────────────────────────────────────────────
  { id: "crohns", label: "Crohn's Disease", category: "Gastrointestinal" },
  { id: "ulcerativeColitis", label: "Ulcerative Colitis", category: "Gastrointestinal" },
  { id: "gerd", label: "GERD (Acid Reflux)", category: "Gastrointestinal" },
  { id: "diverticulitis", label: "Diverticulitis", category: "Gastrointestinal" },
  { id: "ibs", label: "Irritable Bowel Syndrome (IBS)", category: "Gastrointestinal" },
  { id: "pancreatitis", label: "Pancreatitis", category: "Gastrointestinal" },
  { id: "gastricBypass", label: "Gastric Bypass / Weight Loss Surgery", category: "Gastrointestinal" },
  { id: "pepticUlcer", label: "Peptic Ulcer", category: "Gastrointestinal" },

  // ── Liver ───────────────────────────────────────────────────────────
  { id: "hepatitisC", label: "Hepatitis C", category: "Liver" },
  { id: "hepatitisB", label: "Hepatitis B", category: "Liver" },
  { id: "cirrhosis", label: "Cirrhosis", category: "Liver" },

  // ── Renal ───────────────────────────────────────────────────────────
  { id: "kidneyDisease", label: "Kidney Disease", category: "Renal" },
  { id: "kidneyFailure", label: "Kidney Failure / Dialysis", category: "Renal" },
  { id: "kidneyStones", label: "Kidney Stones", category: "Renal" },
  { id: "kidneyTransplant", label: "Kidney Transplant", category: "Renal" },
  { id: "polycysticKidney", label: "Polycystic Kidney Disease", category: "Renal" },

  // ── Autoimmune ──────────────────────────────────────────────────────
  { id: "lupus", label: "Lupus (SLE)", category: "Autoimmune" },
  { id: "rheumatoidArthritis", label: "Rheumatoid Arthritis", category: "Autoimmune" },
  { id: "scleroderma", label: "Scleroderma", category: "Autoimmune" },
  { id: "fibromyalgia", label: "Fibromyalgia", category: "Autoimmune" },

  // ── Blood Disorders ─────────────────────────────────────────────────
  { id: "anemia", label: "Anemia", category: "Blood" },
  { id: "sickleCellAnemia", label: "Sickle Cell Anemia", category: "Blood" },
  { id: "hemophilia", label: "Hemophilia", category: "Blood" },

  // ── Substance ───────────────────────────────────────────────────────
  { id: "alcoholTreatment", label: "Alcohol Treatment (history)", category: "Substance" },
  { id: "drugAbuse", label: "Drug Abuse (history)", category: "Substance" },

  // ── Infectious ──────────────────────────────────────────────────────
  { id: "hivAids", label: "HIV / AIDS", category: "Infectious" },

  // ── Other ───────────────────────────────────────────────────────────
  { id: "organTransplant", label: "Organ Transplant", category: "Other" },
  { id: "chronicPain", label: "Chronic Pain", category: "Other" },
  { id: "chronicFatigue", label: "Chronic Fatigue Syndrome", category: "Other" },
  { id: "paralysis", label: "Paralysis / Paraplegia", category: "Other" },
  { id: "amputation", label: "Amputation", category: "Other" },
  { id: "downSyndrome", label: "Down Syndrome", category: "Other" },
  { id: "autism", label: "Autism / Asperger's", category: "Other" },
  { id: "marfanSyndrome", label: "Marfan Syndrome", category: "Other" },
  { id: "glaucoma", label: "Glaucoma", category: "Other" },
  { id: "osteoarthritis", label: "Osteoarthritis", category: "Other" },
] as const
