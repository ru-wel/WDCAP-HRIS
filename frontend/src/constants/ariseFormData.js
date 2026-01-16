// EXACT ARISE Performance Evaluation Form Items (Word-for-Word from PDF)
// 20 evaluation items organized in 4 sections + scoring

export const ARISE_FORM_ITEMS = {
  scoringGuidelines: [
    {
      value: 3,
      title: 'SUMASANG-AYON',
      text: 'Lubos na ginagampanan ang trabaho, nagpakikita ng kahusayan at higit na nakatutugon at nakakasunod sa mga alituntunin, proseso at patakaran ng kumpanya.'
    },
    {
      value: 2,
      title: 'SAPAT',
      text: 'katamtaman lamang , nakatutugon ngunit paminsan-minsan ay may pagkukulang at hindi lubos na nagagampanan ang trabaho, nakatutupad sa mga alituntunin, proseso at patakaran ng kumpanya ngunit hindi sa lahat ng pagkakataon.'
    },
    {
      value: 1,
      title: 'HINDI  SUMASANG-AYON',
      text: 'lubos na hindi nagagampanan ang trabaho, walang kahusayan na naipapamalas, at hindi nakatutugon at nakakasunod sa mga alituntunin, proseso at patakaran ng kumpanya.'
    }
  ],
  sections: [
    {
      id: 1,
      title: "I. Trabahong Ginagampanan",
      tagalog: "I. Trabahong Ginagampanan",
      items: [
        {
          number: 1,
          text: "Sumusunod sa nakatakdang iskeidyul at mabilis na natatapos ang trabaho ng maayos"
        },
        {
          number: 2,
          text: "Madaling nakakasunod sa instruksyon o utos"
        },
        {
          number: 3,
          text: "May kusa at hindi kailangang utusan"
        },
        {
          number: 4,
          text: "Maparaan, nakapagbibigay ng ideya o input"
        },
        {
          number: 5,
          text: "Sumusunod sa mga proseso, opisyal na utos at patakaran ng kumpanya"
        }
      ]
    },
    {
      id: 2,
      title: "II. Komunikasyon at Pakikisama / Pakikisalamuha",
      tagalog: "II. Komunikasyon at Pakikisama / Pakikisalamuha",
      items: [
        {
          number: 6,
          text: "Magalang, mahinahon, at maayos makipag usap sa mga boss, bisor at kliyente"
        },
        {
          number: 7,
          text: "Magalang, mahinahon, marunong at mabuting makitungo sa mga katrabaho"
        },
        {
          number: 8,
          text: "Madaling nakakatugon sa mga katanungan ng mga boss, bisor, kasamahan at kliyente"
        },
        {
          number: 9,
          text: "Nagpapaalam at nag inform sa mga boss, bisor at katrabaho kung kailangang lumiban sa trabaho"
        }
      ]
    },
    {
      id: 3,
      title: "III. Paggamit ng Materyales / Equipments / Tools",
      tagalog: "III. Paggamit ng Materyales / Equipments / Tools",
      items: [
        {
          number: 10,
          text: "Sapat ang Kaalaman at tama ang Paggamit ng mga equipment, materyales, tools at supplies"
        },
        {
          number: 11,
          text: "Maingat, masinop, malinis sa mga equipment, materyales, tools at supplies"
        },
        {
          number: 12,
          text: "Hindi maaksaya, wasto at tama ang pamamaraan ng paggamit ng mga equipment, materyales, tools at supplies"
        }
      ]
    },
    {
      id: 4,
      title: "IV. Pagpupuntos base sa tungkulin ng paglalarawan ng trabaho at mga responsibilidad (Job description)",
      tagalog: "IV. Pagpupuntos base sa tungkulin ng paglalarawan ng trabaho at mga responsibilidad (Job description)",
      items: [
        {
          number: 13,
          text: "Record Keeping: - Maintaining accurate records of all maintenance and repairs performed. -Documenting service repairs and updating vehicle service records."
        },
        {
          number: 14,
          text: "Inspections and Diagnostics: Conducting regular vehicle inspections to identify potential issues."
        },
        {
          number: 15,
          text: "Repairs and Maintenance"
        },
        {
          number: 16,
          text: "Communication and Coordination: Communicating with technicians, customers, and management regarding vehicle issues."
        },
        {
          number: 17,
          text: "Safety and Compliance: Adhering to all safety procedures and guidelines."
        }
      ]
    },
    {
      id: 5,
      title: "IV. Pagsunod sa Polisiya, Patakaran ng Kumpanya ( HRD ang magpupuno )",
      tagalog: "IV. Pagsunod sa Polisiya, Patakaran ng Kumpanya ( HRD ang magpupuno )",
      items: [
        {
          number: 18,
          text: "Sumusunod sa oras ng pagpasok (Hindi lumiliko at nahuhuli sa trabaho)"
        },
        {
          number: 19,
          text: "Sumusunod sa ibang polisiya, patakaran at alituntunin ng kumpanya (memorandum and company handbook)"
        },
        {
          number: 20,
          text: "Sumusunod sa Health and Safety Requirements (memorandum and guidelines)"
        }
      ]
    }
  ],
  
  scoringScale: [
    { value: 3, tagalog: "Sumasang-ayon", english: "Agree/Satisfactory" },
    { value: 2, tagalog: "Sapat", english: "Adequate/Acceptable" },
    { value: 1, tagalog: "Hindi Sumasangayon", english: "Disagree/Unsatisfactory" }
  ],

  summaryFields: {
    subTotal: "Sub-total:",
    totalScore: "Total Score:",
    equivalentPercentage: "Equivalent Percentage:",
    reliable: "Itutuloy ba ang employment? (Bilugan, i-shade o i-tsek ang kasagutan)",
    reliableOptions: ["Oo itutuloy", "Hindi na Itutuloy"],
    memo: "Komento / Rekomendasyon / Pagyamanilad:"
  },

  performanceRating: [
    {
      range: "20-44",
      tagalog: "Hindi minumungkahing ipagpatuloy pa ang kontrata o employment sa kasalukuyan",
      english: "Not Recommended - Unsatisfactory Performance"
    },
    {
      range: "45-60",
      tagalog: "Lubos na minumungkahing ipagpatuloy ang employment at nirerekomendang tanggapin sa mga susunod na proyekto sa hinaharap",
      english: "Recommended - Satisfactory Performance"
    }
  ]
};

// Helper function to get total possible score
export const getTotalPossibleScore = () => {
  let total = 0;
  ARISE_FORM_ITEMS.sections.forEach(section => {
    total += section.items.length * 3; // max 3 points per item
  });
  return total;
};

// Helper function to calculate percentage
export const calculatePercentage = (score) => {
  const total = getTotalPossibleScore();
  return total > 0 ? Math.round((score / total) * 100) : 0;
};

// Helper function to get performance rating based on score
export const getPerformanceRating = (score) => {
  if (score >= 45) return ARISE_FORM_ITEMS.performanceRating[1];
  return ARISE_FORM_ITEMS.performanceRating[0];
};
