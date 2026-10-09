export type TemplateId = "rank-5" | "team-battle" | "career";

interface HomeProps {
  onSelect: (template: TemplateId) => void;
}

const TEMPLATES: readonly { id: TemplateId; title: string; description: string }[] = [
  { id: "rank-5", title: "Rank 5", description: "رتب أفضل 5 لاعبين مغاربة في رأيك" },
  { id: "team-battle", title: "Team Battle", description: "بطل المغرب 2025 ضد بطل المغرب 2026، لاعب ضد لاعب، بالصوت والصورة" },
  { id: "career", title: "Career Legend", description: "العب مسيرة لاعب مغربي من عمر 17 إلى 38، بقرارات وانتقالات وجوائز" }
];

export function Home({ onSelect }: HomeProps) {
  return (
    <main className="app">
      <section className="studio home">
        <strong className="home__brand" dir="ltr">FOOTBALL REEL</strong>
        <h1 className="home__title">اختر القالب</h1>
        <div className="home__list">
          {TEMPLATES.map((template) => (
            <button key={template.id} type="button" className="template-card" onClick={() => onSelect(template.id)}>
              <span className="template-card__title" dir="ltr">{template.title}</span>
              <span className="template-card__text">{template.description}</span>
            </button>
          ))}
        </div>
      </section>
    </main>
  );
}
