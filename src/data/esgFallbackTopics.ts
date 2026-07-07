import type { EsgTopicCategory } from "../types/esg";

const zhQuestions = [
  "永續經營",
  "環境保護｜綠色營運",
  "社會責任｜幸福職場",
  "公司治理｜創新轉型",
  "三立永續行動－低碳節能",
  "三立永續行動－資源管理",
  "三立永續行動－健康福祉",
  "三立永續行動－綠色製播",
  "三立永續行動－生物多樣性",
  "三立永續行動－永續城鄉",
  "三立永續行動－專業經營",
  "三立永續行動－SDGs 倡議"
];

const enQuestions = [
  "SET FUTURE",
  "Environment | Green Operations",
  "Social Responsibility | Happy Workplace",
  "Corporate Governance | AI-First Transformation",
  "SET Low-Carbon Reporting",
  "SET Resource Management",
  "SET Employee Wellness",
  "SET Green Production",
  "SET Biodiversity",
  "SET Sustainable Communities",
  "SET Professional Excellence",
  "SET SDGs Commitment"
];

export function getFallbackTopics(language: "zh" | "en"): EsgTopicCategory[] {
  const questions = language === "en" ? enQuestions : zhQuestions;

  return [
    {
      id: "esg-default",
      label: language === "en" ? "SET ESG" : "三立 ESG",
      order: 0,
      topics: [
        {
          id: "esg-quick-questions",
          label: language === "en" ? "Quick Questions" : "快速問題",
          order: 0,
          questions
        }
      ]
    }
  ];
}
