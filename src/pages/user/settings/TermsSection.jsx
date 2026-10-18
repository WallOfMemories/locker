import { TERMS, TERMS_UPDATED } from "./settingsContent";

// The text itself lives in settingsContent.js.
function TermsSection() {
  return (
    <div className="settings__stack">
      <p className="settings__hint">Last updated {TERMS_UPDATED}</p>

      <div className="settings__terms">
        {TERMS.map((section) => (
          <section key={section.title}>
            <h3>{section.title}</h3>

            {section.body.map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
          </section>
        ))}
      </div>
    </div>
  );
}

export default TermsSection;