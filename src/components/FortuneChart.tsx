"use client";
import type { ChartView } from "../../server/fortune/charts";
export default function FortuneChart({ chart }: { chart: ChartView }) {
  return (
    <section
      className={`fortune-chart chart-${chart.domain}`}
      aria-label={chart.title}
    >
      <header>
        <h2>{chart.title}</h2>
        <p>계산한 기본 차트부터 확인해 봐. 해설도 이 차트를 바탕으로 이어져.</p>
      </header>
      <div className="chart-grid">
        {chart.groups.map((group, i) => (
          <details
            key={`${group.label}-${i}`}
            open={chart.domain !== "ziwei"}
            className="chart-cell"
          >
            <summary>{group.label}</summary>
            {group.image&&<img className={`tarot-card-image ${group.reversed?"is-reversed":""}`} src={group.image} width={180} height={300} loading="lazy" alt={`${group.items[0].value} · ${group.reversed?"역방향":"정방향"}`}/>}
            <dl>
              {group.items.map((item, j) => (
                <div key={j}>
                  <dt>{item.label}</dt>
                  <dd>{item.value}</dd>
                </div>
              ))}
            </dl>
          </details>
        ))}
      </div>
      <p className="chart-source">
        계산 자료:{" "}
        {chart.source === "local"
          ? "기존 서비스의 한국 달력·천문 계산"
          : chart.source}
      </p>
      {chart.limitations.map((line, i) => (
        <p className="chart-limitation" key={i}>
          {line}
        </p>
      ))}
    </section>
  );
}
