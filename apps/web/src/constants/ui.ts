import type { View } from "../hooks/useJudgewriteApp";

export const ongoingDrafts = [
  {
    docket: "#2024-CV-882",
    title: "米勒诉州立运输公司",
    status: "90% AI 同步",
    summary: "正在根据交叉质证细化证据结论...",
  },
  {
    docket: "#2024-FA-102",
    title: "索恩遗产和解案",
    status: "审核中",
    summary: "等待监护附件的数字签名...",
  },
  {
    docket: "#2023-TX-449",
    title: "全球物流税务上诉案",
    status: "挂起",
    summary: "缺失补充专家证言文件...",
  },
];

export const tuneActions = ["更加严谨/正式", "增加法律论述", "提升表述精炼度"];

export const topNavItems: Array<{ key: View; label: string }> = [
  { key: "upload", label: "工作台" },
  { key: "generate", label: "文书生成器" },
  { key: "styles", label: "风格实验室" },
  { key: "archive", label: "案件库" },
];

export const sideNavItems: Array<{ key: View; icon: string; label: string }> = [
  { key: "upload", icon: "gavel", label: "工作台" },
  { key: "generate", icon: "description", label: "文书生成器" },
  { key: "styles", icon: "architecture", label: "风格实验室" },
  { key: "archive", icon: "inventory_2", label: "案件库" },
  { key: "settings", icon: "settings", label: "设置" },
];

export const mobileNavItems: Array<{ key: View; icon: string; label: string }> = [
  { key: "upload", icon: "gavel", label: "工作台" },
  { key: "generate", icon: "description", label: "生成" },
  { key: "styles", icon: "palette", label: "风格" },
  { key: "archive", icon: "folder_open", label: "案件库" },
  { key: "settings", icon: "settings", label: "设置" },
];
