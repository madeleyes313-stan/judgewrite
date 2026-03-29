import { expect, test } from "@playwright/test";

test("上传到归档回读主链路可用", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("heading", { name: "文书辅助生成助手" }).first()).toBeVisible();

  await page.locator('[data-testid="case-upload-input"]').setInputFiles([
    {
      name: "起诉状.txt",
      mimeType: "text/plain",
      buffer: Buffer.from("原告张某诉称被告李某拖欠借款10万元，请求依法判令偿还本金及利息。", "utf-8"),
    },
    {
      name: "答辩状.txt",
      mimeType: "text/plain",
      buffer: Buffer.from("被告李某辩称双方款项属于投资合作，不属于借贷关系。", "utf-8"),
    },
  ]);

  await page.getByRole("button", { name: "上传卷宗" }).click();
  await expect(page.getByText("卷宗上传成功，已进入待抽取状态。")).toBeVisible();

  const caseIdText = (await page.getByText(/case-[0-9a-f]{8}/).first().textContent()) ?? "";
  const caseId = caseIdText.match(/case-[0-9a-f]{8}/)?.[0];
  expect(caseId).toBeTruthy();

  await page.getByRole("button", { name: /开始要素抽取|重新执行抽取/ }).click();
  await expect(page.getByText("案件要素抽取完成。")).toBeVisible({ timeout: 20000 });

  await page.getByRole("button", { name: /开始生成文书|重新生成文书/ }).click();
  await expect(page.getByText("文书生成完成，可继续审阅与导出。")).toBeVisible({ timeout: 30000 });

  const textarea = page.locator("textarea").first();
  await expect(textarea).toBeVisible();
  const originalDraft = await textarea.inputValue();
  const manualAppendix = "\n\n【人工补充】经复核，双方借款事实与转账凭证能够相互印证。";
  await textarea.fill(`${originalDraft}${manualAppendix}`);

  const resolveButtons = page.getByRole("button", { name: "标记已处理" });
  if ((await resolveButtons.count()) > 0) {
    await resolveButtons.first().click();
  }

  const citationIgnoreButtons = page.getByRole("button", { name: "忽略引用" });
  if ((await citationIgnoreButtons.count()) > 0) {
    await citationIgnoreButtons.first().click();
  }

  await page.getByRole("button", { name: "保存审阅结果" }).click();
  await expect(page.getByText("审阅结果已保存并回写案件库。")).toBeVisible({ timeout: 15000 });

  await page.getByRole("button", { name: "案件库" }).first().click();
  await expect(page.getByRole("heading", { name: "可操作案件库" })).toBeVisible();

  const targetRow = page.locator(`[data-testid="archive-row-${caseId!}"]`);
  await expect(targetRow).toBeVisible();
  await page.locator(`[data-testid="archive-open-${caseId!}"]`).click();
  await expect(page.getByRole("button", { name: "继续审阅该案件" })).toBeVisible();

  await page.getByRole("button", { name: "继续审阅该案件" }).click();
  await expect(page.getByRole("heading", { name: "实时可编辑生成结果" })).toBeVisible();
  await expect(textarea).toHaveValue(new RegExp(escapeRegExp(manualAppendix.trim())));
});

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
