// ARISE Performance Evaluation Form items (kept in backend for PDF export)
export const ARISE_FORM_ITEMS = {
  sections: [
    {
      id: 1,
      title: 'I. Trabahong Ginagampanan',
      items: [
        { number: 1, text: 'Sumusunod sa nakatakdang skedyul at mabilis na natatapos ang trabaho ng maayos' },
        { number: 2, text: 'Madaling nakakasunod sa instruksyon o utos' },
        { number: 3, text: 'May kusa at hindi kailangang utusan' },
        { number: 4, text: 'Maparaan, nakapagbibigay ng ideya o input' },
        { number: 5, text: 'Sumusunod sa mga proseso, opisyal na utos at patakaran ng kumpanya' }
      ]
    },
    {
      id: 2,
      title: 'II. Komunikasyon at Pakikisama/ pakikisalamuha',
      items: [
        { number: 6, text: 'Magalang, mahinahon, at maayos makipag usap sa mga boss, bisor at kliyente' },
        { number: 7, text: 'Magalang, mahinahon, marunong at mabuting makitungo sa mga katrabaho' },
        { number: 8, text: 'Madaling nakakatugon sa mga katanungan ng mga boss, bisor, kasamahan at kliyente' },
        { number: 9, text: 'Nagpapaalam at nag inform sa mga boss, bisor at katrabaho kung kailangang lumiban sa trabaho' }
      ]
    },
    {
      id: 3,
      title: 'III. Paggamit ng Materyales / Equipments / Tools',
      items: [
        {
          number: 10,
          text: 'Sapat ang Kaalaman at tama ang Paggamit ng mga equipment, materyales, tools at supplies'
        },
        { number: 11, text: 'Maingat, masinop, malinis sa mga equipment, materyales, tools at supplies' },
        {
          number: 12,
          text: 'Hindi maaksaya, wasto at tama ang pamamaraan ng paggamit ng mga equipment, materyales, tools at supplies'
        }
      ]
    },
    {
      id: 4,
      title: 'IV. Pagpupuntos base sa tungkulin ng paglalarawan ng trabaho at mga responsibilidad (Job description)',
      items: [
        {
          number: 13,
          text: 'Record Keeping: - Maintaining accurate records of all maintenance and repairs performed. - Documenting service repairs and updating vehicle service records.'
        },
        {
          number: 14,
          text: 'Inspections and Diagnostics: Conducting regular vehicle inspections to identify potential issues.'
        },
        { number: 15, text: 'Repairs and Maintenance' },
        {
          number: 16,
          text: 'Communication and Coordination: Communicating with technicians, customers, and management regarding vehicle issues.'
        },
        { number: 17, text: 'Safety and Compliance: Adhering to all safety procedures and guidelines.' }
      ]
    },
    {
      id: 5,
      title: 'V. Pagsunod sa Polisiya, Patakaran ng Kumpanya ( HRD ang magpupuna )',
      items: [
        { number: 18, text: 'Sumusunod sa oras ng pagpasok (Hindi lumiliko at nahuhuli sa trabaho)' },
        {
          number: 19,
          text: 'Sumusunod sa ibang polisiya, patakaran at alituntunin ng kumpanya (memorandum and company handbook)'
        },
        { number: 20, text: 'Sumusunod sa Health and Safety Requirements (memorandum and guidelines)' }
      ]
    }
  ]
};

export const ARISE_SCORE_LABELS = {
  3: 'Sumasang-ayon',
  2: 'Sapat',
  1: 'Hindi Sumasangayon'
};
