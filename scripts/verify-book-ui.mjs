import { chromium, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import fs from "node:fs/promises";
const browser = await chromium.launch({ channel: "chrome", headless: true });
await fs.mkdir(".integration/book-ui", { recursive: true });
const proof = [];
try {
  for (const width of [360, 390, 430, 1280]) {
    const context = await browser.newContext({
      viewport: { width, height: 900 },
    });
    const page = await context.newPage();
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.route("**/*", (route) =>
      new URL(route.request().url()).hostname === "127.0.0.1"
        ? route.continue()
        : route.abort(),
    );
    for (const [domain, button] of [
      ["saju", "나의 사주"],
      ["ziwei", "나의 명반"],
      ["sukuyo", "나의 본명숙"],
      ["vedic", "나의 베다 차트"],
    ]) {
      await page.goto(`http://127.0.0.1:8790/fortune/?domain=${domain}`);
      await page
        .getByRole("button", { name: new RegExp(button) })
        .first()
        .click();
      await page.locator("[name=adate]").fill("1997-02-10");
      await page.locator("[name=atime]").fill("14:30");
      await page.locator("[name=agender]").selectOption("female");
      await page.getByRole("button", { name: "내 기본 차트 확인하기" }).click();
      await page.locator(".fortune-chart").waitFor({ timeout: 40000 });
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
      await page.screenshot({
        path: `.integration/book-ui/${domain}-${width}.png`,
        fullPage: true,
      });
      const axe = await new AxeBuilder({ page })
        .include(".fortune-chart")
        .withTags(["wcag2a", "wcag2aa"])
        .analyze();
      expect(axe.violations).toEqual([]);
      proof.push({
        domain,
        width,
        chart: true,
        overflow: false,
        accessibilityViolations: axe.violations.length,
      });
      if (domain === "saju") {
        await page
          .getByRole("button", { name: "이 차트로 해설 선택하기" })
          .click();
        await page.getByRole("button", { name: "참치 · 70챕터" }).click();
        await page
          .getByRole("button", { name: "개발용 구매 흐름 확인 · 청구 없음" })
          .click();
        await expect(page.locator(".book-cover")).toContainText(
          "완성 70 / 70",
          { timeout: 60000 },
        );
        await expect(page.locator(".chapter-prose")).toHaveCount(1);

        await expect(page.locator(".chapter-prose")).toContainText("모의 해설");
        await page.getByRole("button", { name: "이 챕터 읽음 표시" }).click();
        await page.reload();
        await expect(page.locator(".book-cover")).toContainText("읽은 챕터 1", {
          timeout: 20000,
        });
        if(width<900)await page.getByRole("button",{name:/목차에서 골라 읽기/}).click();
        await page
          .getByRole("textbox", { name: "내 운명서 검색" })
          .fill("직장에서의 수입");
        await expect(page.locator(".reader-chapter-link")).toHaveCount(1);
        await page.getByRole("textbox", { name: "내 운명서 검색" }).fill("");
        await page
          .getByRole("button", { name: "공유하기", exact: true })
          .click();
        await page.getByRole("button", { name: "공유 카드 미리보기" }).click();
        const img = page.locator(".book-sharing img");
        await img.waitFor();
        await expect
          .poll(() => img.evaluate((e) => e.complete && e.naturalWidth))
          .toBe(1200);
        const imageUrl = await img.getAttribute("src");
        const png = await page.request.get("http://127.0.0.1:8790" + imageUrl);
        expect(png.status()).toBe(200);
        expect(png.headers()["content-type"]).toBe("image/png");
        const vertical=await page.request.get('http://127.0.0.1:8790'+imageUrl.replace('/og.png','/vertical.png'));
        expect(vertical.status()).toBe(200);const bytes=await vertical.body();expect(bytes.readUInt32BE(16)).toBe(1080);expect(bytes.readUInt32BE(20)).toBe(1920);
        if (width === 390)
          await fs.writeFile(
            ".integration/book-ui/share.png",
            await png.body(),
          );
        await page.screenshot({
          path: `.integration/book-ui/book-${width}.png`,
          fullPage: true,
        });
        const bookAxe = await new AxeBuilder({ page })
          .include(".destiny-book")
          .withTags(["wcag2a", "wcag2aa"])
          .analyze();
        expect(bookAxe.violations).toEqual([]);
        await page
          .getByRole("button", { name: "공유 해제", exact: true })
          .click();
        await expect(page.locator('.book-sharing').getByRole("status")).toContainText("해제");
        expect(
          (await page.request.get("http://127.0.0.1:8790" + imageUrl)).status(),
        ).toBe(404);
        proof.push({
          width,
          tunaChapters: 70,
          search: true,
          resume: true,
          png: true,
          revocation: true,
        });
      }
    }
    for(const [fish,count] of [['고등어',5],['연어',13],['광어',30]]){
      await page.goto('http://127.0.0.1:8790/fortune/?domain=saju');
      await page.getByRole('button',{name:/나의 사주/}).first().click();
      await page.locator('[name=adate]').fill('1997-02-10');await page.locator('[name=atime]').fill('14:30');await page.locator('[name=agender]').selectOption('female');
      await page.getByRole('button',{name:'내 기본 차트 확인하기'}).click();
      await page.getByRole('button',{name:'이 차트로 해설 선택하기'}).click();
      await page.getByRole('button',{name:fish+' · '+count+'챕터'}).click();
      await page.getByRole('button',{name:'개발용 구매 흐름 확인 · 청구 없음'}).click();
      await expect(page.locator('.book-cover')).toContainText(`완성 ${count} / ${count}`,{timeout:60000});
      await expect(page.locator(".chapter-prose")).toHaveCount(1);
      await expect(page.locator('.chapter-prose')).toContainText('모의 해설');
      await page.getByRole('button',{name:'이 챕터 읽음 표시'}).click();await page.reload();
      await expect(page.locator('.book-cover')).toContainText('읽은 챕터 1');
      await expect(page.locator('.reader-upgrade')).toContainText('상위 상품은 별도 구매');
      expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
      const axe=await new AxeBuilder({page}).include('.destiny-book').withTags(['wcag2a','wcag2aa']).analyze();expect(axe.violations).toEqual([]);
      proof.push({fish,width,chapters:count,resume:true,lazyBody:true,lockedChapters:true,accessibilityViolations:0});
    }
    expect(errors).toEqual([]);
    await context.close();
  }
} finally {
  await browser.close();
}
await fs.writeFile(
  "docs/book-ui-verification.json",
  JSON.stringify(proof, null, 2),
);
console.log(JSON.stringify(proof));
